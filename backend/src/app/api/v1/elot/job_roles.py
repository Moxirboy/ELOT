"""Job-role CRUD + AI role-plan generator."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import ElotUser, JobRole
from ....schemas.hiring import (
    GeneratedRolePlan,
    GenerateRolePlanRequest,
    GenericMessage,
    JobRoleCreate,
    JobRoleRead,
    JobRoleUpdate,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/job-roles", tags=["job-roles"])
ai_router = APIRouter(prefix="/ai", tags=["hiring-ai"])


# ---------- Job roles CRUD ----------
@router.get("", response_model=list[JobRoleRead])
async def list_job_roles(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[JobRoleRead]:
    rows = (
        await db.execute(
            select(JobRole).where(JobRole.company_id == user.company_id).order_by(JobRole.id.desc())
        )
    ).scalars().all()
    return [JobRoleRead.model_validate(r) for r in rows]


@router.post("", response_model=JobRoleRead, status_code=status.HTTP_201_CREATED)
async def create_job_role(
    payload: JobRoleCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRoleRead:
    role = JobRole(
        company_id=user.company_id,
        title=payload.title,
        description=payload.description,
        department=payload.department,
        seniority=payload.seniority,
        required_skills_json=payload.required_skills_json,
        training_map_json=payload.training_map_json,
        interview_plan_json=payload.interview_plan_json,
        assessment_plan_json=payload.assessment_plan_json,
        rubric_json=payload.rubric_json,
        onboarding_plan_json=payload.onboarding_plan_json,
        role_profile_json=payload.role_profile_json,
        responsible_ai_notes_json=payload.responsible_ai_notes_json,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return JobRoleRead.model_validate(role)


async def _get_role(db: AsyncSession, company_id: int, role_id: int) -> JobRole:
    role = (
        await db.execute(
            select(JobRole).where(JobRole.id == role_id, JobRole.company_id == company_id)
        )
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.get("/{job_role_id}", response_model=JobRoleRead)
async def get_job_role(
    job_role_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRoleRead:
    return JobRoleRead.model_validate(await _get_role(db, user.company_id, job_role_id))


@router.patch("/{job_role_id}", response_model=JobRoleRead)
async def update_job_role(
    job_role_id: int,
    payload: JobRoleUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> JobRoleRead:
    role = await _get_role(db, user.company_id, job_role_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(role, k, v)
    role.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(role)
    return JobRoleRead.model_validate(role)


@router.delete("/{job_role_id}", response_model=GenericMessage)
async def delete_job_role(
    job_role_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    role = await _get_role(db, user.company_id, job_role_id)
    await db.delete(role)
    await db.commit()
    return GenericMessage(message="Role deleted")


# ---------- AI role plan generator ----------
@ai_router.post(
    "/generate-role-plan",
    response_model=GeneratedRolePlan,
    response_model_by_alias=True,
)
async def generate_role_plan(
    payload: GenerateRolePlanRequest,
    user: Annotated[ElotUser, Depends(get_current_admin)],
) -> GeneratedRolePlan:
    """Run the AI role-plan generator and return the structured plan.

    The caller is expected to POST the plan back to `/job-roles` if they
    want to persist it.
    """
    plan = await ai_service.generate_role_plan(
        title=payload.title,
        department=payload.department,
        seniority=payload.seniority,
        role_description=payload.role_description,
        company_context=payload.company_notes,
    )
    return GeneratedRolePlan.model_validate(plan)
