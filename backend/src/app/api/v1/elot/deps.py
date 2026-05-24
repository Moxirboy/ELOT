"""ELOT-specific dependencies and helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import settings
from ....core.db.database import async_get_db
from ....models import Candidate, Company, ElotUser

ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY.get_secret_value()


def make_access_token(
    user_id: int,
    company_id: int,
    role: str,
    email: str,
    *,
    candidate_id: int | None = None,
    employee_id: int | None = None,
) -> str:
    expire = datetime.now(UTC) + timedelta(hours=24)
    payload: dict = {
        "sub": email,
        "user_id": user_id,
        "company_id": company_id,
        "role": role,
        "exp": int(expire.timestamp()),
        "token_type": "access",
    }
    if candidate_id is not None:
        payload["candidate_id"] = candidate_id
    if employee_id is not None:
        payload["employee_id"] = employee_id
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc


async def get_current_elot_user(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> ElotUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    result = await db.execute(select(ElotUser).where(ElotUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_admin(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
) -> ElotUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


# ---------------------------------------------------------------------------
# Multi-role gates — Onboarding OS roles
# ---------------------------------------------------------------------------
# Roles we recognise everywhere. ``admin`` always passes role gates.
ALL_ROLES = {
    "admin",
    "learner",
    "manager",
    "supervisor",
    "buddy",
    "it",
}


def require_roles(*allowed: str):
    """Build a FastAPI dependency that allows any of ``allowed`` (admin always allowed)."""

    allowed_set = set(allowed)

    async def _dep(
        user: Annotated[ElotUser, Depends(get_current_elot_user)],
    ) -> ElotUser:
        if user.role == "admin" or user.role in allowed_set:
            return user
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' is not allowed here — need one of: admin / {', '.join(sorted(allowed_set))}",
        )

    return _dep


async def get_current_employee_for_user(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """Resolve the Employee row tied to a logged-in role user.

    Lookup order: token's ``employee_id`` claim → email match. Used by the
    manager / supervisor / buddy / IT dashboards to auto-derive ownership
    instead of asking the URL for an id.
    """
    from ....models import Employee

    authorization_header = None  # we already have the user; no need to re-decode
    # Best-effort: take employee_id from the row's email (the demo-role
    # endpoint guarantees email parity between ElotUser and Employee).
    if user.role == "admin":
        # Admin doesn't map to a single employee; bail.
        raise HTTPException(
            status_code=400,
            detail="Admin has no scoped employee — pass an employee_id in the URL.",
        )
    result = await db.execute(
        select(Employee).where(
            Employee.company_id == user.company_id,
            Employee.email == user.email,
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="No Employee record matches the logged-in user.",
        )
    return employee


async def ensure_demo_company(db: AsyncSession, name: str = "GDG Demo Corp") -> Company:
    result = await db.execute(select(Company).where(Company.name == name))
    company = result.scalar_one_or_none()
    if company:
        return company
    company = Company(name=name, industry="Technology")
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


# ---------------------------------------------------------------------------
# Candidate authentication
# ---------------------------------------------------------------------------
async def get_current_candidate(
    db: Annotated[AsyncSession, Depends(async_get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> Candidate:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if payload.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidate role required")
    cid = payload.get("candidate_id")
    if not cid:
        raise HTTPException(status_code=401, detail="Invalid candidate token")
    result = await db.execute(select(Candidate).where(Candidate.id == cid))
    cand = result.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=401, detail="Candidate not found")
    return cand
