"""Post-hire onboarding endpoints — convert candidate → employee, assign plan, track progress."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    Candidate,
    CandidateScorecard,
    ElotUser,
    Employee,
    JobRole,
    OnboardingPlan,
)
from ....schemas.hiring import (
    OnboardingModuleStatusUpdate,
    OnboardingPlanRead,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
candidate_convert_router = APIRouter(prefix="/candidates", tags=["onboarding"])


COMPANY_POLICIES = (
    "- Customer data must not be shared via Telegram, WhatsApp, personal email, "
    "USB drives, or public AI tools.\n"
    "- Refund requests above $100 must be escalated to a manager.\n"
    "- Suspicious links, password requests, and unusual payment requests must be "
    "reported to security.\n"
    "- Workplace harassment and discrimination are not tolerated.\n"
    "- New employees must complete security, data privacy, and workplace "
    "conduct training."
)


async def _ensure_employee_for_candidate(
    db: AsyncSession, cand: Candidate, role: JobRole
) -> Employee:
    if cand.hired_employee_id:
        emp = (
            await db.execute(
                select(Employee).where(Employee.id == cand.hired_employee_id)
            )
        ).scalar_one_or_none()
        if emp:
            return emp
    emp = Employee(
        company_id=cand.company_id,
        name=cand.full_name,
        email=cand.email,
        department=role.department,
        job_role=role.title,
        risk_level="low",
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    cand.hired_employee_id = emp.id
    cand.status = "hired"
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    return emp


# ---------- Convert candidate → employee + auto-assign onboarding ----------
@candidate_convert_router.post(
    "/{candidate_id}/convert-to-employee",
    response_model=OnboardingPlanRead,
    status_code=status.HTTP_201_CREATED,
)
async def convert_to_employee(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead:
    cand = (
        await db.execute(
            select(Candidate).where(
                Candidate.id == candidate_id, Candidate.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    emp = await _ensure_employee_for_candidate(db, cand, role)

    # Build the onboarding plan via AI (or fallback)
    scorecard = (
        await db.execute(
            select(CandidateScorecard).where(CandidateScorecard.candidate_id == cand.id)
        )
    ).scalar_one_or_none()
    plan_payload = await ai_service.generate_onboarding_plan(
        role_profile=role.role_profile_json or {"title": role.title, "department": role.department, "seniority": role.seniority},
        scorecard=(
            {
                "weaknesses": scorecard.weaknesses_json,
                "strengths": scorecard.strengths_json,
                "overallReadinessScore": scorecard.overall_readiness_score,
            }
            if scorecard
            else None
        ),
        company_policies=COMPANY_POLICIES,
    )

    # Materialise modules with status fields
    modules_with_state = [
        {
            **m,
            "status": "not_started",
            "score": 0,
            "completed_at": None,
        }
        for m in (plan_payload.get("modules") or [])
    ]

    # Replace any existing onboarding plan for this employee
    existing_plan = (
        await db.execute(
            select(OnboardingPlan).where(
                OnboardingPlan.employee_id == emp.id,
                OnboardingPlan.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if existing_plan:
        await db.delete(existing_plan)
        await db.commit()

    plan = OnboardingPlan(
        company_id=user.company_id,
        employee_id=emp.id,
        title=plan_payload.get("title") or f"{role.title} — onboarding plan",
        source_candidate_id=cand.id,
        modules_json=modules_with_state,
        manager_checklist_json=plan_payload.get("managerChecklist", []),
        status="active",
        readiness_score=0,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return OnboardingPlanRead.model_validate(plan)


@candidate_convert_router.post(
    "/{candidate_id}/assign-onboarding",
    response_model=OnboardingPlanRead,
)
async def assign_from_candidate(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead:
    return await convert_to_employee(candidate_id, user, db)


# ---------- Admin: assign from candidate (alias for clarity) ----------
@router.post("/assign-from-candidate/{candidate_id}", response_model=OnboardingPlanRead)
async def assign_from_candidate_alt(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead:
    return await convert_to_employee(candidate_id, user, db)


# ---------- Employee onboarding views ----------
@router.get("/employee/{employee_id}", response_model=OnboardingPlanRead)
async def get_employee_onboarding(
    employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead:
    plan = (
        await db.execute(
            select(OnboardingPlan).where(
                OnboardingPlan.employee_id == employee_id,
                OnboardingPlan.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="No onboarding plan for this employee")
    return OnboardingPlanRead.model_validate(plan)


@router.get("/mine", response_model=OnboardingPlanRead | None)
async def get_my_onboarding(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead | None:
    """Convenience endpoint for the learner — resolves their Employee row by email."""
    emp = (
        await db.execute(
            select(Employee).where(
                Employee.company_id == user.company_id, Employee.email == user.email
            )
        )
    ).scalar_one_or_none()
    if not emp:
        return None
    plan = (
        await db.execute(
            select(OnboardingPlan).where(OnboardingPlan.employee_id == emp.id)
        )
    ).scalar_one_or_none()
    return OnboardingPlanRead.model_validate(plan) if plan else None


@router.patch("/employee/{employee_id}/module", response_model=OnboardingPlanRead)
async def update_module_status(
    employee_id: int,
    payload: OnboardingModuleStatusUpdate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingPlanRead:
    plan = (
        await db.execute(
            select(OnboardingPlan).where(
                OnboardingPlan.employee_id == employee_id,
                OnboardingPlan.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="No onboarding plan")

    modules = list(plan.modules_json or [])
    if payload.module_index < 0 or payload.module_index >= len(modules):
        raise HTTPException(status_code=404, detail="Module index out of range")
    modules[payload.module_index] = {
        **modules[payload.module_index],
        "status": payload.status,
        "score": max(0, min(100, payload.score)),
        "completed_at": datetime.now(UTC).isoformat() if payload.status == "completed" else None,
    }
    plan.modules_json = modules

    completed_scores = [int(m.get("score", 0)) for m in modules if m.get("status") == "completed"]
    if completed_scores:
        plan.readiness_score = int(round(sum(completed_scores) / len(completed_scores)))
    if all(m.get("status") == "completed" for m in modules):
        plan.status = "completed"
    await db.commit()
    await db.refresh(plan)
    return OnboardingPlanRead.model_validate(plan)
