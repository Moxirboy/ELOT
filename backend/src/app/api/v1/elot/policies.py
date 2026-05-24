"""Policy endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import ElotUser, Policy
from ....schemas.elot import GenericMessage, PolicyCreate, PolicyRead
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[PolicyRead])
async def list_policies(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[PolicyRead]:
    result = await db.execute(
        select(Policy).where(Policy.company_id == user.company_id).order_by(Policy.id.desc())
    )
    return [PolicyRead.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: PolicyCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PolicyRead:
    policy = Policy(
        company_id=user.company_id,
        title=payload.title,
        content=payload.content,
        language=payload.language,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return PolicyRead.model_validate(policy)


@router.get("/{policy_id}", response_model=PolicyRead)
async def get_policy(
    policy_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> PolicyRead:
    result = await db.execute(
        select(Policy).where(Policy.id == policy_id, Policy.company_id == user.company_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return PolicyRead.model_validate(policy)


@router.delete("/{policy_id}", response_model=GenericMessage)
async def delete_policy(
    policy_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    result = await db.execute(
        select(Policy).where(Policy.id == policy_id, Policy.company_id == user.company_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)
    await db.commit()
    return GenericMessage(message="Policy deleted")
