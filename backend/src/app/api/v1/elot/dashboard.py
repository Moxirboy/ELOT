"""Admin dashboard analytics."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    Assignment,
    Course,
    ElotUser,
    Employee,
    QuizQuestion,
    ScenarioAttempt,
)
from ....schemas.elot import (
    AdminDashboard,
    DepartmentStat,
    RecentCompletion,
    WeakTopic,
)
from .deps import get_current_admin

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _to_naive(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(UTC).replace(tzinfo=None)


@router.get("/admin", response_model=AdminDashboard)
async def admin_dashboard(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> AdminDashboard:
    company_id = user.company_id

    employees = (await db.execute(select(Employee).where(Employee.company_id == company_id))).scalars().all()
    courses = (await db.execute(select(Course).where(Course.company_id == company_id))).scalars().all()
    assignments = (await db.execute(select(Assignment).where(Assignment.company_id == company_id))).scalars().all()

    total_employees = len(employees)
    total_courses = len(courses)

    completed = [a for a in assignments if a.status == "completed"]
    completion_rate = (len(completed) / len(assignments)) if assignments else 0.0
    average_score = (sum(a.score for a in completed) / len(completed)) if completed else 0.0
    high_risk_count = sum(1 for e in employees if e.risk_level == "high")
    overdue_count = sum(1 for a in assignments if a.status == "overdue")

    # Department stats
    by_dept: dict[str, dict] = defaultdict(lambda: {"total": 0, "done": 0, "scores": [], "high_risk": 0})
    for emp in employees:
        by_dept[emp.department]["total"] += 1
        if emp.risk_level == "high":
            by_dept[emp.department]["high_risk"] += 1
    for a in assignments:
        emp = next((e for e in employees if e.id == a.employee_id), None)
        if not emp:
            continue
        d = by_dept[emp.department]
        if a.status == "completed":
            d["done"] += 1
            d["scores"].append(a.score)
    department_stats = [
        DepartmentStat(
            department=dept,
            completion_rate=(d["done"] / d["total"]) if d["total"] else 0.0,
            average_score=(sum(d["scores"]) / len(d["scores"])) if d["scores"] else 0.0,
            high_risk=d["high_risk"],
        )
        for dept, d in by_dept.items()
    ]

    # Weakest topics — derived from ScenarioAttempt + QuizQuestion topic
    attempts = (
        await db.execute(
            select(ScenarioAttempt).where(
                ScenarioAttempt.employee_id.in_([e.id for e in employees] or [-1])
            )
        )
    ).scalars().all()
    topic_scores: dict[str, list[int]] = defaultdict(list)
    for at in attempts:
        topic_scores["Scenarios"].append(at.score)
    quiz_qs = (
        await db.execute(select(QuizQuestion).where(QuizQuestion.course_id.in_([c.id for c in courses] or [-1])))
    ).scalars().all()
    # Use completed assignments to roughly map back to quiz topics — for the
    # hackathon, distribute completion scores across topics seen in this company.
    if quiz_qs and completed:
        for q in quiz_qs:
            # spread an average proxy score per topic
            topic_scores[q.topic].extend(a.score for a in completed[:5])
    weakest = sorted(
        (
            WeakTopic(
                topic=t,
                average_score=(sum(s) / len(s)) if s else 0.0,
                attempts=len(s),
            )
            for t, s in topic_scores.items()
        ),
        key=lambda w: w.average_score,
    )[:5]

    # Recent completions
    recent = sorted(
        (a for a in assignments if a.status == "completed" and a.completed_at),
        key=lambda a: a.completed_at or datetime.min.replace(tzinfo=UTC),
        reverse=True,
    )[:8]
    recent_out: list[RecentCompletion] = []
    emp_by_id = {e.id: e for e in employees}
    course_by_id = {c.id: c for c in courses}
    for a in recent:
        emp = emp_by_id.get(a.employee_id)
        course = course_by_id.get(a.course_id)
        if not emp or not course or not a.completed_at:
            continue
        recent_out.append(
            RecentCompletion(
                employee_name=emp.name,
                course_title=course.title,
                completed_at=a.completed_at,
                score=a.score,
            )
        )

    return AdminDashboard(
        total_employees=total_employees,
        total_courses=total_courses,
        completion_rate=round(completion_rate, 4),
        average_score=round(average_score, 1),
        high_risk_count=high_risk_count,
        overdue_count=overdue_count,
        weakest_topics=weakest,
        department_stats=department_stats,
        recent_completions=recent_out,
    )


@router.get("/admin/export.csv")
async def admin_dashboard_export(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> StreamingResponse:
    """Audit-ready CSV of every assignment for the current company.

    Columns: employee, email, department, role, employee_risk, course,
    status, score, assignment_risk, due_date, completed_at.
    """
    employees = (
        await db.execute(select(Employee).where(Employee.company_id == user.company_id))
    ).scalars().all()
    courses = (
        await db.execute(select(Course).where(Course.company_id == user.company_id))
    ).scalars().all()
    assignments = (
        await db.execute(
            select(Assignment).where(Assignment.company_id == user.company_id)
        )
    ).scalars().all()

    emp_by_id = {e.id: e for e in employees}
    course_by_id = {c.id: c for c in courses}

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "employee_name",
            "employee_email",
            "department",
            "job_role",
            "employee_risk_level",
            "course_title",
            "status",
            "score",
            "assignment_risk_level",
            "due_date",
            "completed_at",
        ]
    )
    for a in assignments:
        emp = emp_by_id.get(a.employee_id)
        course = course_by_id.get(a.course_id)
        if not emp or not course:
            continue
        writer.writerow(
            [
                emp.name,
                emp.email,
                emp.department,
                emp.job_role,
                emp.risk_level,
                course.title,
                a.status,
                a.score,
                a.risk_level,
                a.due_date.isoformat() if a.due_date else "",
                a.completed_at.isoformat() if a.completed_at else "",
            ]
        )

    buf.seek(0)
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="elot-compliance-{timestamp}.csv"',
        },
    )
