"""Company endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import Company, ElotUser
from ....schemas.elot import CompanyRead
from .deps import get_current_elot_user

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyRead)
async def get_my_company(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CompanyRead:
    result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = result.scalar_one()
    return CompanyRead.model_validate(company)
