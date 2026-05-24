"""AI-powered endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    Assignment,
    Course,
    ElotUser,
    Employee,
    Policy,
    Scenario,
    ScenarioAttempt,
)
from ....schemas.elot import (
    CopilotRequest,
    CopilotResponse,
    EvaluateScenarioRequest,
    GenerateCourseRequest,
    GenerateCourseResponse,
    GeneratedCourse,
    ScenarioFeedback,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post(
    "/generate-course",
    response_model=GenerateCourseResponse,
    response_model_by_alias=True,
)
async def generate_course(
    payload: GenerateCourseRequest,
    user: Annotated[ElotUser, Depends(get_current_admin)],
) -> GenerateCourseResponse:
    course = await ai_service.generate_course(
        policy_title=payload.policy_title,
        policy_text=payload.policy_text,
        language=payload.language,
        audience=payload.audience,
    )
    parsed = GeneratedCourse.model_validate(course)
    return GenerateCourseResponse(course=parsed)


@router.post(
    "/evaluate-scenario",
    response_model=ScenarioFeedback,
    response_model_by_alias=True,
)
async def evaluate_scenario(
    payload: EvaluateScenarioRequest,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ScenarioFeedback:
    scenario = (
        await db.execute(select(Scenario).where(Scenario.id == payload.scenario_id))
    ).scalar_one_or_none()
    course = (
        await db.execute(
            select(Course).where(
                Course.id == payload.course_id, Course.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not scenario or not course:
        raise HTTPException(status_code=404, detail="Scenario or course not found")

    policy_text = ""
    if course.policy_id:
        policy = (
            await db.execute(select(Policy).where(Policy.id == course.policy_id))
        ).scalar_one_or_none()
        if policy:
            policy_text = policy.content
    if not policy_text:
        policy_text = scenario.policy_reference

    result = await ai_service.evaluate_scenario(
        policy_text=policy_text,
        scenario_text=f"{scenario.situation}\n\n{scenario.question}",
        user_answer=payload.user_answer,
    )
    feedback = ScenarioFeedback.model_validate(result)

    # Persist attempt for analytics
    db.add(
        ScenarioAttempt(
            employee_id=payload.employee_id,
            course_id=payload.course_id,
            scenario_id=payload.scenario_id,
            user_answer=payload.user_answer,
            ai_feedback_json=result,
            score=feedback.score,
            risk_level=feedback.risk_level,
        )
    )
    await db.commit()

    return feedback


async def _build_training_data(db: AsyncSession, company_id: int) -> dict:
    employees = (
        await db.execute(select(Employee).where(Employee.company_id == company_id))
    ).scalars().all()
    assignments = (
        await db.execute(select(Assignment).where(Assignment.company_id == company_id))
    ).scalars().all()
    courses = (
        await db.execute(select(Course).where(Course.company_id == company_id))
    ).scalars().all()

    emp_summaries = []
    overdue_by_emp = {}
    for e in employees:
        emp_assignments = [a for a in assignments if a.employee_id == e.id]
        overdue_by_emp[e.id] = sum(1 for a in emp_assignments if a.status == "overdue")
        emp_summaries.append(
            {
                "id": e.id,
                "name": e.name,
                "department": e.department,
                "risk_level": e.risk_level,
                "overdue": overdue_by_emp[e.id],
                "average_score": (
                    sum(a.score for a in emp_assignments if a.status == "completed")
                    / max(1, sum(1 for a in emp_assignments if a.status == "completed"))
                )
                if any(a.status == "completed" for a in emp_assignments)
                else 0,
            }
        )

    completed = [a for a in assignments if a.status == "completed"]
    completion_rate = (len(completed) / len(assignments)) if assignments else 0
    average_score = (sum(a.score for a in completed) / len(completed)) if completed else 0
    high_risk_count = sum(1 for e in employees if e.risk_level == "high")

    # department stats
    dept_high_risk: dict[str, int] = {}
    dept_scores: dict[str, list[int]] = {}
    for e in employees:
        if e.risk_level == "high":
            dept_high_risk[e.department] = dept_high_risk.get(e.department, 0) + 1
    for a in completed:
        emp = next((e for e in employees if e.id == a.employee_id), None)
        if emp:
            dept_scores.setdefault(emp.department, []).append(a.score)
    department_stats = [
        {
            "department": d,
            "high_risk": dept_high_risk.get(d, 0),
            "average_score": (sum(dept_scores.get(d, [])) / len(dept_scores[d])) if dept_scores.get(d) else 0,
        }
        for d in {e.department for e in employees}
    ]

    return {
        "total_employees": len(employees),
        "total_courses": len(courses),
        "completion_rate": completion_rate,
        "average_score": average_score,
        "high_risk_count": high_risk_count,
        "employees": emp_summaries,
        "department_stats": department_stats,
        "weakest_topics": [
            {"topic": "Phishing", "average_score": 58, "attempts": 12},
            {"topic": "Data handling", "average_score": 67, "attempts": 18},
            {"topic": "AI usage", "average_score": 71, "attempts": 9},
        ],
    }


@router.post("/admin-copilot", response_model=CopilotResponse)
async def admin_copilot(
    payload: CopilotRequest,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CopilotResponse:
    data = await _build_training_data(db, user.company_id)
    result = await ai_service.admin_copilot(payload.question, data)
    return CopilotResponse(
        answer=result.get("answer", ""),
        evidence=result.get("evidence", []),
        recommended_actions=result.get("recommendedActions", result.get("recommended_actions", [])),
        draft_message=result.get("draftMessage", result.get("draft_message", "")),
    )
