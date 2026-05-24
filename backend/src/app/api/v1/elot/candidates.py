"""Candidate CRUD + pipeline actions + scorecard + dashboards."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    AIInterview,
    Candidate,
    CandidateScorecard,
    CandidateTrainingModule,
    ElotUser,
    Employee,
    JobRole,
    OnboardingPlan,
)
from ....schemas.hiring import (
    CandidateCreate,
    CandidateRead,
    CandidateScorecardRead,
    CandidateUpdate,
    GenericMessage,
    HiringDashboard,
    HiringPipelineStat,
    OnboardingReadinessDashboard,
)
from ....services import ai as ai_service
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/candidates", tags=["candidates"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["hiring-dashboard"])


def _enrich(cand: Candidate, role: JobRole | None) -> CandidateRead:
    out = CandidateRead.model_validate(cand)
    out.role_title = role.title if role else None
    return out


# ---------- CRUD ----------
@router.get("", response_model=list[CandidateRead])
async def list_candidates(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    role_id: int | None = None,
    status_filter: str | None = None,
) -> list[CandidateRead]:
    q = select(Candidate, JobRole).join(JobRole, JobRole.id == Candidate.job_role_id).where(
        Candidate.company_id == user.company_id
    )
    if role_id is not None:
        q = q.where(Candidate.job_role_id == role_id)
    if status_filter:
        q = q.where(Candidate.status == status_filter)
    q = q.order_by(Candidate.id.desc())
    rows = (await db.execute(q)).all()
    return [_enrich(c, r) for c, r in rows]


@router.post("", response_model=CandidateRead, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    payload: CandidateCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    role = (
        await db.execute(
            select(JobRole).where(
                JobRole.id == payload.job_role_id, JobRole.company_id == user.company_id
            )
        )
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    cand = Candidate(
        company_id=user.company_id,
        job_role_id=role.id,
        full_name=payload.full_name,
        email=payload.email.lower(),
        notes=payload.notes,
        status="applied",
    )
    db.add(cand)
    await db.commit()
    await db.refresh(cand)
    return _enrich(cand, role)


async def _get_candidate(db: AsyncSession, company_id: int, candidate_id: int) -> Candidate:
    c = (
        await db.execute(
            select(Candidate).where(
                Candidate.id == candidate_id, Candidate.company_id == company_id
            )
        )
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return c


@router.get("/{candidate_id}", response_model=CandidateRead)
async def get_candidate(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    c = await _get_candidate(db, user.company_id, candidate_id)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == c.job_role_id))
    ).scalar_one_or_none()
    return _enrich(c, role)


@router.patch("/{candidate_id}", response_model=CandidateRead)
async def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    c = await _get_candidate(db, user.company_id, candidate_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(c)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == c.job_role_id))
    ).scalar_one_or_none()
    return _enrich(c, role)


# ---------- Pipeline actions ----------
@router.post("/{candidate_id}/assign-training", response_model=CandidateRead)
async def assign_training(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    cand = await _get_candidate(db, user.company_id, candidate_id)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Wipe existing modules for the candidate to keep idempotent re-assigns clean
    existing = (
        await db.execute(
            select(CandidateTrainingModule).where(
                CandidateTrainingModule.candidate_id == cand.id
            )
        )
    ).scalars().all()
    for m in existing:
        await db.delete(m)
    await db.commit()

    training_map = role.training_map_json or []
    for i, item in enumerate(training_map):
        db.add(
            CandidateTrainingModule(
                candidate_id=cand.id,
                job_role_id=role.id,
                title=item.get("title", f"Module {i + 1}"),
                description=item.get("description", ""),
                content=item.get("content", ""),
                quiz_json=item.get("quiz", []),
                order_index=i,
                status="not_started",
            )
        )
    cand.status = "training_assigned"
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(cand)
    return _enrich(cand, role)


@router.post("/{candidate_id}/reject", response_model=CandidateRead)
async def reject_candidate(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    cand = await _get_candidate(db, user.company_id, candidate_id)
    cand.status = "rejected"
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(cand)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    return _enrich(cand, role)


@router.post("/{candidate_id}/mark-hired", response_model=CandidateRead)
async def mark_hired(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateRead:
    cand = await _get_candidate(db, user.company_id, candidate_id)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Idempotent — only create the Employee row once
    if not cand.hired_employee_id:
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
    await db.refresh(cand)
    return _enrich(cand, role)


# ---------- Scorecard ----------
@router.post(
    "/{candidate_id}/generate-scorecard",
    response_model=CandidateScorecardRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_scorecard(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateScorecardRead:
    cand = await _get_candidate(db, user.company_id, candidate_id)
    role = (
        await db.execute(select(JobRole).where(JobRole.id == cand.job_role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    modules = (
        await db.execute(
            select(CandidateTrainingModule)
            .where(CandidateTrainingModule.candidate_id == cand.id)
            .order_by(CandidateTrainingModule.order_index)
        )
    ).scalars().all()
    interview = (
        await db.execute(
            select(AIInterview)
            .where(AIInterview.candidate_id == cand.id)
            .order_by(AIInterview.id.desc())
        )
    ).scalar_one_or_none()

    training_results = {
        "modules": [
            {
                "title": m.title,
                "status": m.status,
                "score": m.score,
            }
            for m in modules
        ],
        "average_score": (
            sum(m.score for m in modules if m.status == "completed")
            / max(1, sum(1 for m in modules if m.status == "completed"))
            if modules
            else 0
        ),
    }
    interview_results = (
        {
            "overall_score": interview.overall_score,
            "recommendation": interview.recommendation,
            "transcript": interview.transcript_json,
            "scores": interview.score_json,
        }
        if interview
        else {"overall_score": 0, "recommendation": "", "transcript": [], "scores": []}
    )

    payload = await ai_service.generate_candidate_scorecard(
        candidate={
            "id": cand.id,
            "full_name": cand.full_name,
            "training_progress": cand.training_progress,
            "ai_interview_score": cand.ai_interview_score,
            "readiness_score": cand.readiness_score,
            "role_title": role.title,
        },
        training_results=training_results,
        interview_results=interview_results,
        rubric=role.rubric_json,
    )

    # Upsert latest scorecard
    existing = (
        await db.execute(
            select(CandidateScorecard).where(CandidateScorecard.candidate_id == cand.id)
        )
    ).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()

    scorecard = CandidateScorecard(
        candidate_id=cand.id,
        job_role_id=role.id,
        overall_readiness_score=payload.get("overallReadinessScore", 0),
        strengths_json=payload.get("strengths", []),
        weaknesses_json=payload.get("weaknesses", []),
        skill_scores_json=payload.get("skillScores", []),
        risk_flags_json=payload.get("riskFlags", []),
        suggested_hr_questions_json=payload.get("suggestedHRInterviewQuestions", []),
        recommended_next_step=payload.get("recommendation", "needs_more_review"),
        ai_summary=payload.get("summary", ""),
        responsible_ai_note=payload.get(
            "responsibleAINote",
            "AI recommendation for HR review only — not an automated hiring decision.",
        ),
    )
    db.add(scorecard)
    cand.readiness_score = scorecard.overall_readiness_score
    cand.recommendation = scorecard.recommended_next_step
    cand.status = "hr_review"
    cand.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(scorecard)
    return CandidateScorecardRead.model_validate(scorecard)


@router.get("/{candidate_id}/scorecard", response_model=CandidateScorecardRead)
async def get_scorecard(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> CandidateScorecardRead:
    cand = await _get_candidate(db, user.company_id, candidate_id)
    sc = (
        await db.execute(
            select(CandidateScorecard).where(CandidateScorecard.candidate_id == cand.id)
        )
    ).scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not generated yet")
    return CandidateScorecardRead.model_validate(sc)


# ---------- Generic delete ----------
@router.delete("/{candidate_id}", response_model=GenericMessage)
async def delete_candidate(
    candidate_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    c = await _get_candidate(db, user.company_id, candidate_id)
    await db.delete(c)
    await db.commit()
    return GenericMessage(message="Candidate deleted")


# ---------- HR dashboards ----------
@dashboard_router.get("/hiring", response_model=HiringDashboard)
async def hiring_dashboard(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> HiringDashboard:
    roles = (
        await db.execute(select(JobRole).where(JobRole.company_id == user.company_id))
    ).scalars().all()
    candidates = (
        await db.execute(
            select(Candidate).where(Candidate.company_id == user.company_id)
        )
    ).scalars().all()
    interviews = (
        await db.execute(
            select(AIInterview).order_by(AIInterview.created_at.desc()).limit(8)
        )
    ).scalars().all()

    pipeline_counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        pipeline_counts[c.status] += 1
    pipeline = [
        HiringPipelineStat(status=s, count=n)
        for s, n in sorted(pipeline_counts.items(), key=lambda kv: kv[0])
    ]

    avg_readiness = (
        sum(c.readiness_score for c in candidates) / len(candidates)
        if candidates
        else 0.0
    )
    ready_for_hr = sum(
        1
        for c in candidates
        if c.recommendation == "invite_to_hr_interview" or c.status == "hr_review"
    )
    needs_review = sum(1 for c in candidates if c.recommendation == "needs_more_review")

    cand_by_id = {c.id: c for c in candidates}
    recent = []
    for iv in interviews:
        cand = cand_by_id.get(iv.candidate_id)
        if not cand or cand.company_id != user.company_id:
            continue
        recent.append(
            {
                "interview_id": iv.id,
                "candidate_id": iv.candidate_id,
                "candidate_name": cand.full_name,
                "overall_score": iv.overall_score,
                "recommendation": iv.recommendation,
                "created_at": iv.created_at.isoformat(),
            }
        )

    return HiringDashboard(
        total_roles=len(roles),
        total_candidates=len(candidates),
        pipeline=pipeline,
        avg_readiness=round(avg_readiness, 1),
        ready_for_hr_interview=ready_for_hr,
        recent_ai_interviews=recent[:5],
        needs_review=needs_review,
    )


@dashboard_router.get(
    "/onboarding-readiness", response_model=OnboardingReadinessDashboard
)
async def onboarding_readiness(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> OnboardingReadinessDashboard:
    plans = (
        await db.execute(
            select(OnboardingPlan).where(OnboardingPlan.company_id == user.company_id)
        )
    ).scalars().all()
    emp_ids = [p.employee_id for p in plans]
    emp_rows = (
        await db.execute(select(Employee).where(Employee.id.in_(emp_ids or [-1])))
    ).scalars().all()
    emp_by_id = {e.id: e for e in emp_rows}

    weak_topics: dict[str, list[int]] = defaultdict(list)
    employees_out: list[dict] = []
    for p in plans:
        emp = emp_by_id.get(p.employee_id)
        if not emp:
            continue
        completed_scores = []
        for m in p.modules_json or []:
            if m.get("status") == "completed":
                completed_scores.append(int(m.get("score", 0)))
                # Track weakness by module type
                if int(m.get("score", 0)) < 70:
                    weak_topics[m.get("type", "other")].append(int(m.get("score", 0)))
        avg = (sum(completed_scores) / len(completed_scores)) if completed_scores else 0
        employees_out.append(
            {
                "employee_id": emp.id,
                "name": emp.name,
                "department": emp.department,
                "title": p.title,
                "readiness_score": p.readiness_score,
                "modules_total": len(p.modules_json or []),
                "modules_completed": sum(
                    1 for m in (p.modules_json or []) if m.get("status") == "completed"
                ),
                "average_score": round(avg, 1),
            }
        )

    avg_overall = (
        sum(p.readiness_score for p in plans) / len(plans) if plans else 0.0
    )
    weak_out = [
        {
            "topic": t,
            "average_score": round(sum(s) / len(s), 1) if s else 0,
            "incidents": len(s),
        }
        for t, s in sorted(weak_topics.items(), key=lambda kv: sum(kv[1]) / max(1, len(kv[1])))
    ][:5]

    return OnboardingReadinessDashboard(
        total_onboardings=len(plans),
        avg_readiness=round(avg_overall, 1),
        weak_topics=weak_out,
        employees=employees_out,
    )
