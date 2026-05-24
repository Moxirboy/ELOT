"""Employee management endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import ElotUser, Employee
from ....schemas.elot import EmployeeCreate, EmployeeRead, EmployeeUpdate, GenericMessage
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeRead])
async def list_employees(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    department: str | None = None,
) -> list[EmployeeRead]:
    q = select(Employee).where(Employee.company_id == user.company_id)
    if department:
        q = q.where(Employee.department == department)
    q = q.order_by(Employee.id)
    result = await db.execute(q)
    return [EmployeeRead.model_validate(e) for e in result.scalars().all()]


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> EmployeeRead:
    employee = Employee(
        company_id=user.company_id,
        name=payload.name,
        email=payload.email,
        department=payload.department,
        job_role=payload.job_role,
        risk_level=payload.risk_level,
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return EmployeeRead.model_validate(employee)


async def _get_employee(db: AsyncSession, company_id: int, employee_id: int) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.company_id == company_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.get("/{employee_id}", response_model=EmployeeRead)
async def get_employee(
    employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> EmployeeRead:
    employee = await _get_employee(db, user.company_id, employee_id)
    return EmployeeRead.model_validate(employee)


@router.patch("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> EmployeeRead:
    employee = await _get_employee(db, user.company_id, employee_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(employee, k, v)
    await db.commit()
    await db.refresh(employee)
    return EmployeeRead.model_validate(employee)


@router.delete("/{employee_id}", response_model=GenericMessage)
async def delete_employee(
    employee_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    employee = await _get_employee(db, user.company_id, employee_id)
    await db.delete(employee)
    await db.commit()
    return GenericMessage(message="Employee deleted")
