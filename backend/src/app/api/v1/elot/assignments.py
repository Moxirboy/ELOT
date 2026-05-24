"""Assignment endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import Assignment, Certificate, Course, ElotUser, Employee
from ....schemas.elot import (
    AssignmentCreate,
    AssignmentRead,
    AssignmentStatusUpdate,
)
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=list[AssignmentRead])
async def list_assignments(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[AssignmentRead]:
    result = await db.execute(
        select(Assignment).where(Assignment.company_id == user.company_id).order_by(Assignment.id.desc())
    )
    return [AssignmentRead.model_validate(a) for a in result.scalars().all()]


@router.post("", response_model=list[AssignmentRead], status_code=status.HTTP_201_CREATED)
async def create_assignments(
    payload: AssignmentCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[AssignmentRead]:
    # Validate course belongs to company
    course = (
        await db.execute(
            select(Course).where(Course.id == payload.course_id, Course.company_id == user.company_id)
        )
    ).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Resolve employees
    employees: list[Employee] = []
    if payload.employee_ids:
        rows = await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id,
                Employee.id.in_(payload.employee_ids),
            )
        )
        employees = list(rows.scalars().all())
    elif payload.department:
        rows = await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id,
                Employee.department == payload.department,
            )
        )
        employees = list(rows.scalars().all())
    if not employees:
        raise HTTPException(status_code=400, detail="No employees selected")

    created: list[Assignment] = []
    for emp in employees:
        # Skip if already assigned & active
        existing = await db.execute(
            select(Assignment).where(
                Assignment.employee_id == emp.id,
                Assignment.course_id == course.id,
                Assignment.status.in_(["not_started", "in_progress"]),
            )
        )
        if existing.scalar_one_or_none():
            continue
        a = Assignment(
            company_id=user.company_id,
            employee_id=emp.id,
            course_id=course.id,
            status="not_started",
            risk_level=emp.risk_level,
            due_date=payload.due_date,
        )
        db.add(a)
        created.append(a)

    await db.commit()
    for a in created:
        await db.refresh(a)
    return [AssignmentRead.model_validate(a) for a in created]


@router.get("/learner", response_model=list[AssignmentRead])
async def list_learner_assignments(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[AssignmentRead]:
    employee = (
        await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id, Employee.email == user.email
            )
        )
    ).scalar_one_or_none()
    if not employee:
        return []
    rows = await db.execute(
        select(Assignment).where(Assignment.employee_id == employee.id).order_by(Assignment.id.desc())
    )
    return [AssignmentRead.model_validate(a) for a in rows.scalars().all()]


async def _get_owned_assignment(db: AsyncSession, company_id: int, assignment_id: int) -> Assignment:
    a = (
        await db.execute(
            select(Assignment).where(
                Assignment.id == assignment_id, Assignment.company_id == company_id
            )
        )
    ).scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


@router.patch("/{assignment_id}/start", response_model=AssignmentRead)
async def start_assignment(
    assignment_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> AssignmentRead:
    a = await _get_owned_assignment(db, user.company_id, assignment_id)
    if a.status == "not_started":
        a.status = "in_progress"
        await db.commit()
        await db.refresh(a)
    return AssignmentRead.model_validate(a)


@router.patch("/{assignment_id}/complete", response_model=AssignmentRead)
async def complete_assignment(
    assignment_id: int,
    payload: AssignmentStatusUpdate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> AssignmentRead:
    a = await _get_owned_assignment(db, user.company_id, assignment_id)
    a.status = "completed"
    a.completed_at = datetime.now(UTC)
    if payload.score is not None:
        a.score = max(0, min(100, payload.score))
    if payload.risk_level is not None:
        a.risk_level = payload.risk_level
    # Issue certificate automatically
    cert = (
        await db.execute(
            select(Certificate).where(
                Certificate.employee_id == a.employee_id,
                Certificate.course_id == a.course_id,
            )
        )
    ).scalar_one_or_none()
    if not cert and a.score >= 60:
        cert_id = f"ELOT-{a.employee_id:04d}-{a.course_id:04d}-{int(datetime.now(UTC).timestamp())}"
        db.add(
            Certificate(
                employee_id=a.employee_id,
                course_id=a.course_id,
                certificate_id=cert_id,
            )
        )
    await db.commit()
    await db.refresh(a)
    return AssignmentRead.model_validate(a)
