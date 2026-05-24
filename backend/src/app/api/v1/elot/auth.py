"""Demo-friendly auth routes for ELOT AI.

Per spec, these are intentionally simple so hackathon demos start
instantly without needing to create an account.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    Candidate,
    ElotUser,
    Employee,
    OnbInstance,
)
from ....schemas.elot import MeResponse, TokenResponse
from ....schemas.hiring import CandidateRead, CandidateTokenResponse
from .deps import ALL_ROLES, ensure_demo_company, get_current_elot_user, make_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_or_create_user(
    db: AsyncSession, *, email: str, full_name: str, role: str, company_id: int
) -> ElotUser:
    result = await db.execute(select(ElotUser).where(ElotUser.email == email))
    user = result.scalar_one_or_none()
    if user:
        user.role = role
        user.full_name = full_name
        user.company_id = company_id
    else:
        user = ElotUser(
            company_id=company_id,
            email=email,
            full_name=full_name,
            role=role,
            hashed_password="",
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/demo-admin", response_model=TokenResponse)
async def demo_admin_login(
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    company = await ensure_demo_company(db)
    user = await _get_or_create_user(
        db,
        email="admin@gdgdemo.com",
        full_name="Aziza Karimova",
        role="admin",
        company_id=company.id,
    )
    token = make_access_token(user.id, company.id, "admin", user.email)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
    )


@router.post("/demo-learner", response_model=TokenResponse)
async def demo_learner_login(
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    company = await ensure_demo_company(db)
    # Pick the first employee as learner-facing identity.
    result = await db.execute(
        select(Employee).where(Employee.company_id == company.id).order_by(Employee.id).limit(1)
    )
    employee = result.scalar_one_or_none()
    learner_email = employee.email if employee else "learner@gdgdemo.com"
    learner_name = employee.name if employee else "Bekzod Yusupov"
    user = await _get_or_create_user(
        db,
        email=learner_email,
        full_name=learner_name,
        role="learner",
        company_id=company.id,
    )
    token = make_access_token(user.id, company.id, "learner", user.email)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
            "employee_id": employee.id if employee else None,
        },
    )


@router.get("/me", response_model=MeResponse)
async def me(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> MeResponse:
    # For any non-admin role we surface the matching Employee.id so the
    # frontend doesn't need a separate lookup before hitting role dashboards.
    employee_id: int | None = None
    if user.role != "admin":
        row = (
            await db.execute(
                select(Employee).where(
                    Employee.company_id == user.company_id,
                    Employee.email == user.email,
                )
            )
        ).scalar_one_or_none()
        if row:
            employee_id = row.id
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,  # type: ignore[arg-type]
        company_id=user.company_id,
        employee_id=employee_id,
    )


# ---------------------------------------------------------------------------
# Onboarding-OS role login + role discovery
# ---------------------------------------------------------------------------
class RoleLoginRequest(BaseModel):
    role: Literal["manager", "supervisor", "buddy", "it"]
    employee_id: int


class RoleOptionEmployee(BaseModel):
    employee_id: int
    name: str
    department: str
    instance_count: int


class RoleOptionsResponse(BaseModel):
    managers: list[RoleOptionEmployee]
    supervisors: list[RoleOptionEmployee]
    buddies: list[RoleOptionEmployee]
    it_owners: list[RoleOptionEmployee]


@router.post("/demo-role", response_model=TokenResponse)
async def demo_role_login(
    payload: RoleLoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    """Log in as a specific employee in a specific Onboarding-OS role.

    Lazily creates an ElotUser keyed off the employee's email so per-role
    JWTs always resolve to the same identity.
    """
    if payload.role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail="Unknown role")

    company = await ensure_demo_company(db)
    employee = (
        await db.execute(
            select(Employee).where(
                Employee.id == payload.employee_id,
                Employee.company_id == company.id,
            )
        )
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Make / update the ElotUser. We *update* the role on every login so the
    # same person can switch hats during a demo.
    user = (
        await db.execute(select(ElotUser).where(ElotUser.email == employee.email))
    ).scalar_one_or_none()
    if user:
        user.role = payload.role
        user.full_name = employee.name
        user.company_id = company.id
    else:
        user = ElotUser(
            company_id=company.id,
            email=employee.email,
            full_name=employee.name,
            role=payload.role,
            hashed_password="",
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)

    token = make_access_token(
        user_id=user.id,
        company_id=company.id,
        role=payload.role,
        email=user.email,
        employee_id=employee.id,
    )
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": payload.role,
            "company_id": user.company_id,
            "employee_id": employee.id,
        },
    )


@router.get("/role-options", response_model=RoleOptionsResponse)
async def role_options(
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> RoleOptionsResponse:
    """List employees who currently hold each Onboarding-OS role.

    Powers the role-picker on the login page so demos can switch hats
    without needing to remember employee IDs.
    """
    instances = (await db.execute(select(OnbInstance))).scalars().all()

    def _agg(attr: str) -> dict[int, int]:
        out: dict[int, int] = {}
        for inst in instances:
            eid = getattr(inst, attr)
            if eid:
                out[eid] = out.get(eid, 0) + 1
        return out

    counts = {
        "managers": _agg("manager_id"),
        "supervisors": _agg("supervisor_id"),
        "buddies": _agg("buddy_id"),
        "it_owners": _agg("it_owner_id"),
    }
    all_ids = set().union(*(set(c.keys()) for c in counts.values())) or {-1}
    employees = (
        await db.execute(select(Employee).where(Employee.id.in_(all_ids)))
    ).scalars().all()
    by_id = {e.id: e for e in employees}

    def _shape(bucket: dict[int, int]) -> list[RoleOptionEmployee]:
        return sorted(
            [
                RoleOptionEmployee(
                    employee_id=eid,
                    name=by_id[eid].name,
                    department=by_id[eid].department,
                    instance_count=n,
                )
                for eid, n in bucket.items()
                if eid in by_id
            ],
            key=lambda x: x.name,
        )

    return RoleOptionsResponse(
        managers=_shape(counts["managers"]),
        supervisors=_shape(counts["supervisors"]),
        buddies=_shape(counts["buddies"]),
        it_owners=_shape(counts["it_owners"]),
    )


@router.post("/demo-candidate", response_model=CandidateTokenResponse)
async def demo_candidate_login(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    email: str | None = None,
    candidate_id: int | None = None,
) -> CandidateTokenResponse:
    """Demo candidate login.

    Accepts either ``email`` (case-insensitive) or a numeric ``candidate_id``
    and returns a candidate-scoped JWT. Picks the first candidate if neither
    is given.
    """
    q = select(Candidate)
    if candidate_id is not None:
        q = q.where(Candidate.id == candidate_id)
    elif email:
        q = q.where(Candidate.email == email.lower())
    candidate = (await db.execute(q.limit(1))).scalar_one_or_none()
    if not candidate:
        candidate = (
            await db.execute(select(Candidate).order_by(Candidate.id).limit(1))
        ).scalar_one_or_none()
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="No candidates exist yet — seed the demo first.",
        )

    token = make_access_token(
        user_id=0,  # candidate is not an ElotUser
        company_id=candidate.company_id,
        role="candidate",
        email=candidate.email,
        candidate_id=candidate.id,
    )
    return CandidateTokenResponse(
        access_token=token,
        candidate=CandidateRead.model_validate(candidate),
    )
