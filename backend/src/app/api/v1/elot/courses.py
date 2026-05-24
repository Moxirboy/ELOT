"""Course endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import Course, ElotUser, Lesson, QuizQuestion, Scenario
from ....schemas.elot import (
    CourseCreate,
    CourseDetail,
    CourseRead,
    CourseUpdate,
    GenericMessage,
)
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/courses", tags=["courses"])


def _materialize_course_payload(course: Course, payload: dict) -> tuple[list[Lesson], list[Scenario], list[QuizQuestion]]:
    """Convert AI-generated JSON into ORM rows attached to the course."""
    lessons_data = payload.get("lessons", []) if payload else []
    scenarios_data = payload.get("scenarios", []) if payload else []
    quiz_data = payload.get("quiz", []) if payload else []

    lessons = [
        Lesson(
            course_id=course.id,
            title=l.get("title", f"Lesson {i + 1}"),
            content=l.get("content", ""),
            key_takeaway=l.get("keyTakeaway", l.get("key_takeaway", "")),
            order_index=i,
        )
        for i, l in enumerate(lessons_data)
    ]
    scenarios = [
        Scenario(
            course_id=course.id,
            title=s.get("title", f"Scenario {i + 1}"),
            situation=s.get("situation", ""),
            question=s.get("question", ""),
            ideal_answer=s.get("idealAnswer", s.get("ideal_answer", "")),
            risk_level=s.get("riskLevel", s.get("risk_level", "medium")),
            policy_reference=s.get("policyReference", s.get("policy_reference", "")),
        )
        for i, s in enumerate(scenarios_data)
    ]
    quiz = [
        QuizQuestion(
            course_id=course.id,
            question=q.get("question", ""),
            options_json=q.get("options", []),
            correct_answer=q.get("correctAnswer", q.get("correct_answer", "")),
            explanation=q.get("explanation", ""),
            topic=q.get("topic", "General"),
        )
        for q in quiz_data
    ]
    return lessons, scenarios, quiz


@router.get("", response_model=list[CourseRead])
async def list_courses(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[CourseRead]:
    result = await db.execute(
        select(Course).where(Course.company_id == user.company_id).order_by(Course.id.desc())
    )
    return [CourseRead.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CourseRead:
    course = Course(
        company_id=user.company_id,
        policy_id=payload.policy_id,
        title=payload.title,
        description=payload.description,
        estimated_minutes=payload.estimated_minutes,
        difficulty=payload.difficulty,
        language=payload.language,
        generated_json=payload.generated_json,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)

    if payload.generated_json:
        lessons, scenarios, quiz = _materialize_course_payload(course, payload.generated_json)
        db.add_all([*lessons, *scenarios, *quiz])
        await db.commit()

    return CourseRead.model_validate(course)


@router.get("/{course_id}", response_model=CourseDetail)
async def get_course(
    course_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CourseDetail:
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.company_id == user.company_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    lessons = (
        await db.execute(select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.order_index))
    ).scalars().all()
    scenarios = (
        await db.execute(select(Scenario).where(Scenario.course_id == course.id))
    ).scalars().all()
    quiz = (
        await db.execute(select(QuizQuestion).where(QuizQuestion.course_id == course.id))
    ).scalars().all()

    base = CourseRead.model_validate(course)
    return CourseDetail(
        **base.model_dump(),
        lessons=[
            {
                "id": l.id,
                "title": l.title,
                "content": l.content,
                "key_takeaway": l.key_takeaway,
                "order_index": l.order_index,
            }
            for l in lessons
        ],
        scenarios=[
            {
                "id": s.id,
                "title": s.title,
                "situation": s.situation,
                "question": s.question,
                "ideal_answer": s.ideal_answer,
                "risk_level": s.risk_level,
                "policy_reference": s.policy_reference,
            }
            for s in scenarios
        ],
        quiz=[
            {
                "id": q.id,
                "question": q.question,
                "options": q.options_json,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "topic": q.topic,
            }
            for q in quiz
        ],
    )


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CourseRead:
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.company_id == user.company_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(course, k, v)
    await db.commit()
    await db.refresh(course)
    return CourseRead.model_validate(course)


@router.delete("/{course_id}", response_model=GenericMessage)
async def delete_course(
    course_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.company_id == user.company_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(course)
    await db.commit()
    return GenericMessage(message="Course deleted")
