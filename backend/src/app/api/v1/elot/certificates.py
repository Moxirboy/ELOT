"""Certificate endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import Assignment, Certificate, Course, ElotUser, Employee
from ....schemas.elot import CertificateCreate, CertificateRead
from .deps import get_current_elot_user

router = APIRouter(prefix="/certificates", tags=["certificates"])


def _generate_certificate_id(employee_id: int, course_id: int) -> str:
    ts = int(datetime.now(UTC).timestamp())
    return f"ELOT-{employee_id:04d}-{course_id:04d}-{ts}"


@router.post("", response_model=CertificateRead, status_code=status.HTTP_201_CREATED)
async def issue_certificate(
    payload: CertificateCreate,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CertificateRead:
    employee = (
        await db.execute(
            select(Employee).where(
                Employee.id == payload.employee_id, Employee.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    course = (
        await db.execute(
            select(Course).where(
                Course.id == payload.course_id, Course.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not employee or not course:
        raise HTTPException(status_code=404, detail="Employee or course not found")

    existing = (
        await db.execute(
            select(Certificate).where(
                Certificate.employee_id == employee.id, Certificate.course_id == course.id
            )
        )
    ).scalar_one_or_none()
    if existing:
        return CertificateRead(
            id=existing.id,
            employee_id=existing.employee_id,
            course_id=existing.course_id,
            certificate_id=existing.certificate_id,
            issued_at=existing.issued_at,
            employee_name=employee.name,
            course_title=course.title,
        )

    cert = Certificate(
        employee_id=employee.id,
        course_id=course.id,
        certificate_id=_generate_certificate_id(employee.id, course.id),
    )
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return CertificateRead(
        id=cert.id,
        employee_id=cert.employee_id,
        course_id=cert.course_id,
        certificate_id=cert.certificate_id,
        issued_at=cert.issued_at,
        employee_name=employee.name,
        course_title=course.title,
    )


@router.get("/{certificate_id}", response_model=CertificateRead)
async def get_certificate(
    certificate_id: str,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CertificateRead:
    row = (
        await db.execute(
            select(Certificate, Employee, Course, Assignment)
            .join(Employee, Employee.id == Certificate.employee_id)
            .join(Course, Course.id == Certificate.course_id)
            .join(
                Assignment,
                (Assignment.employee_id == Certificate.employee_id)
                & (Assignment.course_id == Certificate.course_id),
                isouter=True,
            )
            .where(Certificate.certificate_id == certificate_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")
    cert, employee, course, assignment = row
    if employee.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return CertificateRead(
        id=cert.id,
        employee_id=cert.employee_id,
        course_id=cert.course_id,
        certificate_id=cert.certificate_id,
        issued_at=cert.issued_at,
        employee_name=employee.name,
        course_title=course.title,
        score=assignment.score if assignment else None,
    )
