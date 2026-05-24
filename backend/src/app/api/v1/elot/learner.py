"""Learner-facing endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import Assignment, Certificate, Course, ElotUser, Employee, Lesson, QuizQuestion, Scenario
from ....schemas.elot import (
    CertificateRead,
    CourseDetail,
    CourseRead,
    LearnerCourseListItem,
    LearnerDashboard,
)
from .deps import get_current_elot_user

router = APIRouter(prefix="/learner", tags=["learner"])


async def _resolve_employee(db: AsyncSession, user: ElotUser) -> Employee:
    employee = (
        await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id, Employee.email == user.email
            )
        )
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found for this user")
    return employee


@router.get("/dashboard", response_model=LearnerDashboard)
async def learner_dashboard(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> LearnerDashboard:
    employee = await _resolve_employee(db, user)

    assignments = (
        await db.execute(
            select(Assignment, Course)
            .join(Course, Course.id == Assignment.course_id)
            .where(Assignment.employee_id == employee.id)
            .order_by(Assignment.id.desc())
        )
    ).all()

    counts = {"completed": 0, "in_progress": 0, "not_started": 0, "overdue": 0}
    courses_list: list[LearnerCourseListItem] = []
    for a, c in assignments:
        counts[a.status] = counts.get(a.status, 0) + 1
        courses_list.append(
            LearnerCourseListItem(
                assignment_id=a.id,
                course_id=c.id,
                title=c.title,
                description=c.description,
                estimated_minutes=c.estimated_minutes,
                status=a.status,
                score=a.score,
                risk_level=a.risk_level,
                due_date=a.due_date,
                completed_at=a.completed_at,
            )
        )

    certificates_rows = (
        await db.execute(
            select(Certificate, Course)
            .join(Course, Course.id == Certificate.course_id)
            .where(Certificate.employee_id == employee.id)
            .order_by(Certificate.issued_at.desc())
        )
    ).all()
    certificates = [
        CertificateRead(
            id=cert.id,
            employee_id=cert.employee_id,
            course_id=cert.course_id,
            certificate_id=cert.certificate_id,
            issued_at=cert.issued_at,
            employee_name=employee.name,
            course_title=course.title,
        )
        for cert, course in certificates_rows
    ]

    return LearnerDashboard(
        employee_id=employee.id,
        employee_name=employee.name,
        department=employee.department,
        completed=counts.get("completed", 0),
        in_progress=counts.get("in_progress", 0),
        not_started=counts.get("not_started", 0),
        overdue=counts.get("overdue", 0),
        courses=courses_list,
        certificates=certificates,
    )


@router.get("/courses/{course_id}", response_model=CourseDetail)
async def learner_course_detail(
    course_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CourseDetail:
    course = (
        await db.execute(
            select(Course).where(Course.id == course_id, Course.company_id == user.company_id)
        )
    ).scalar_one_or_none()
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


@router.get(
    "/courses/{course_id}/transcript.txt",
    response_class=PlainTextResponse,
    responses={200: {"content": {"text/plain": {}}}},
)
async def learner_course_transcript(
    course_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PlainTextResponse:
    """Plain-text transcript for accessibility + downloadable record."""
    course = (
        await db.execute(
            select(Course).where(
                Course.id == course_id, Course.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    lessons = (
        await db.execute(
            select(Lesson)
            .where(Lesson.course_id == course.id)
            .order_by(Lesson.order_index)
        )
    ).scalars().all()
    scenarios = (
        await db.execute(select(Scenario).where(Scenario.course_id == course.id))
    ).scalars().all()
    quiz = (
        await db.execute(
            select(QuizQuestion).where(QuizQuestion.course_id == course.id)
        )
    ).scalars().all()

    parts: list[str] = []
    parts.append(f"ELOT AI — {course.title}\n")
    parts.append("=" * 60)
    if course.description:
        parts.append(course.description)
    parts.append("")

    objectives = (course.generated_json or {}).get("learningObjectives") or []
    if objectives:
        parts.append("What you'll learn")
        parts.append("-" * 20)
        parts.extend(f"  • {o}" for o in objectives)
        parts.append("")

    parts.append("Lessons")
    parts.append("-" * 20)
    for lesson in lessons:
        parts.append(f"\n{lesson.order_index + 1}. {lesson.title}")
        parts.append("")
        parts.append(lesson.content)
        if lesson.key_takeaway:
            parts.append(f"\nKey takeaway: {lesson.key_takeaway}")

    if scenarios:
        parts.append("\n")
        parts.append("Scenarios")
        parts.append("-" * 20)
        for i, s in enumerate(scenarios, 1):
            parts.append(f"\nScenario {i}: {s.title}  [risk: {s.risk_level}]")
            parts.append(f"Situation: {s.situation}")
            parts.append(f"Question: {s.question}")
            if s.ideal_answer:
                parts.append(f"Ideal response: {s.ideal_answer}")
            if s.policy_reference:
                parts.append(f"Policy reference: {s.policy_reference}")

    if quiz:
        parts.append("\n")
        parts.append("Quiz")
        parts.append("-" * 20)
        for i, q in enumerate(quiz, 1):
            parts.append(f"\n{i}. {q.question}")
            for opt in q.options_json or []:
                marker = "*" if opt == q.correct_answer else "-"
                parts.append(f"  {marker} {opt}")
            if q.explanation:
                parts.append(f"  Explanation: {q.explanation}")

    limitations = (course.generated_json or {}).get("limitations") or []
    if limitations:
        parts.append("\n")
        parts.append("Limitations & disclaimer")
        parts.append("-" * 20)
        parts.extend(f"  • {l}" for l in limitations)

    parts.append(
        "\n\n--\nGenerated by ELOT AI — Employee Learning & Onboarding Trainer."
        " Not legal advice. AI-generated training requires admin review."
    )
    return PlainTextResponse(
        content="\n".join(parts),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{course.title.replace(" ", "_")}_transcript.txt"'
            )
        },
    )
