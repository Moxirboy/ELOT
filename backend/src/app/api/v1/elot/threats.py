"""Threat-feed monitor + AI summariser + training generator endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.db.database import async_get_db
from ....models import (
    ElotUser,
    GeneratedTraining,
    ThreatReport,
    ThreatSource,
    ThreatTrend,
)
from ....schemas.security import (
    GeneratedTrainingRead,
    GenericMessage,
    SyncResponse,
    ThreatReportRead,
    ThreatSourceCreate,
    ThreatSourceRead,
    ThreatTrendRead,
)
from ....services import ai as ai_service
from ....services.defang import defang
from ....services.sample_threats import SAMPLE_SOURCES, SAMPLE_TREND_BUNDLES
from .deps import get_current_admin, get_current_elot_user

router = APIRouter(prefix="/threats", tags=["threats"])


# ---------- Sources ----------
@router.get("/sources", response_model=list[ThreatSourceRead])
async def list_sources(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[ThreatSourceRead]:
    rows = (await db.execute(select(ThreatSource).order_by(ThreatSource.id))).scalars().all()
    if rows:
        return [ThreatSourceRead.model_validate(s) for s in rows]
    # First boot — populate from sample so the page is never empty
    for s in SAMPLE_SOURCES:
        db.add(ThreatSource(**s))
    await db.commit()
    rows = (await db.execute(select(ThreatSource).order_by(ThreatSource.id))).scalars().all()
    return [ThreatSourceRead.model_validate(s) for s in rows]


@router.post("/sources", response_model=ThreatSourceRead, status_code=201)
async def create_source(
    payload: ThreatSourceCreate,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ThreatSourceRead:
    src = ThreatSource(
        name=payload.name,
        source_type=payload.source_type,
        url=defang(payload.url),
        enabled=payload.enabled,
    )
    db.add(src)
    await db.commit()
    await db.refresh(src)
    return ThreatSourceRead.model_validate(src)


# ---------- Sync ----------
@router.post("/sync", response_model=SyncResponse)
async def sync_threats(
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> SyncResponse:
    """Run the daily worker logic on demand.

    For the hackathon demo we always run the sample-trend ingest so the UI
    has fresh data. A production deployment would parse RSS feeds from
    each enabled source here.
    """
    # Make sure sources exist
    src_rows = (await db.execute(select(ThreatSource))).scalars().all()
    if not src_rows:
        for s in SAMPLE_SOURCES:
            db.add(ThreatSource(**s))
        await db.commit()
        src_rows = (await db.execute(select(ThreatSource))).scalars().all()

    elot_source = next(
        (s for s in src_rows if s.source_type == "sample"),
        src_rows[0],
    )

    new_reports = 0
    new_trends = 0
    for bundle in SAMPLE_TREND_BUNDLES:
        existing = (
            await db.execute(
                select(ThreatReport).where(
                    ThreatReport.title == bundle["report"]["title"]
                )
            )
        ).scalar_one_or_none()
        if existing:
            report = existing
        else:
            report = ThreatReport(
                source_id=elot_source.id,
                title=bundle["report"]["title"],
                summary=defang(bundle["report"]["summary"]),
                raw_content=defang(bundle["report"]["raw_content"]),
                published_at=bundle["report"]["published_at"],
                source_url=defang(bundle["report"]["source_url"]),
                confidence_score=bundle["report"]["confidence_score"],
            )
            db.add(report)
            await db.commit()
            await db.refresh(report)
            new_reports += 1

        existing_trend = (
            await db.execute(
                select(ThreatTrend).where(ThreatTrend.report_id == report.id)
            )
        ).scalar_one_or_none()
        if existing_trend:
            continue

        summary = bundle["summary"]
        db.add(
            ThreatTrend(
                report_id=report.id,
                title=summary["title"],
                method=summary["method"],
                channel=summary["channel"],
                target_roles_json=summary["target_users"],
                red_flags_json=summary["red_flags"],
                safe_response_json=summary["safe_response"],
                risk_level=bundle["risk_level"],
                ai_summary_json=summary,
            )
        )
        new_trends += 1

    elot_source.last_checked_at = datetime.now(UTC)
    await db.commit()

    return SyncResponse(
        fetched_reports=new_reports,
        new_trends=new_trends,
        sources_used=[s.name for s in src_rows if s.enabled],
        used_sample_fallback=True,
    )


# ---------- Reports + trends ----------
@router.get("/reports", response_model=list[ThreatReportRead])
async def list_reports(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    limit: int = 30,
) -> list[ThreatReportRead]:
    rows = (
        await db.execute(
            select(ThreatReport).order_by(ThreatReport.published_at.desc().nullslast()).limit(limit)
        )
    ).scalars().all()
    return [ThreatReportRead.model_validate(r) for r in rows]


@router.get("/trends", response_model=list[ThreatTrendRead])
async def list_trends(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    limit: int = 30,
) -> list[ThreatTrendRead]:
    rows = (
        await db.execute(
            select(ThreatTrend).order_by(ThreatTrend.created_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [ThreatTrendRead.model_validate(r) for r in rows]


@router.get("/trends/{trend_id}", response_model=ThreatTrendRead)
async def get_trend(
    trend_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ThreatTrendRead:
    trend = (
        await db.execute(select(ThreatTrend).where(ThreatTrend.id == trend_id))
    ).scalar_one_or_none()
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    return ThreatTrendRead.model_validate(trend)


# ---------- Training generation ----------
@router.post(
    "/trends/{trend_id}/generate-training",
    response_model=GeneratedTrainingRead,
    status_code=201,
)
async def generate_training_for_trend(
    trend_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GeneratedTrainingRead:
    trend = (
        await db.execute(select(ThreatTrend).where(ThreatTrend.id == trend_id))
    ).scalar_one_or_none()
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    summary = trend.ai_summary_json or {
        "title": trend.title,
        "method": trend.method,
        "channel": trend.channel,
        "target_users": trend.target_roles_json,
        "red_flags": trend.red_flags_json,
        "safe_response": trend.safe_response_json,
        "training_recommendation": "",
    }
    payload = await ai_service.generate_security_training(summary)

    training = GeneratedTraining(
        company_id=user.company_id,
        trend_id=trend.id,
        title=payload.get("title") or trend.title,
        lesson_json={
            "lesson": payload.get("lesson", ""),
            "summary": payload.get("summary", ""),
            "redFlags": payload.get("redFlags", []),
            "safeActions": payload.get("safeActions", []),
            "adminNotes": payload.get("adminNotes", ""),
            "limitations": payload.get("limitations", []),
        },
        quiz_json=payload.get("quiz", []),
        scenario_json=payload.get("scenario"),
        status="draft",
    )
    db.add(training)
    await db.commit()
    await db.refresh(training)
    return GeneratedTrainingRead.model_validate(training)


@router.get("/trainings", response_model=list[GeneratedTrainingRead])
async def list_trainings(
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> list[GeneratedTrainingRead]:
    rows = (
        await db.execute(
            select(GeneratedTraining)
            .where(GeneratedTraining.company_id == user.company_id)
            .order_by(GeneratedTraining.id.desc())
        )
    ).scalars().all()
    return [GeneratedTrainingRead.model_validate(t) for t in rows]


@router.get("/trainings/{training_id}", response_model=GeneratedTrainingRead)
async def get_training(
    training_id: int,
    user: Annotated[ElotUser, Depends(get_current_elot_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GeneratedTrainingRead:
    t = (
        await db.execute(
            select(GeneratedTraining).where(
                GeneratedTraining.id == training_id,
                GeneratedTraining.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Training not found")
    return GeneratedTrainingRead.model_validate(t)


@router.post(
    "/trainings/{training_id}/approve",
    response_model=GeneratedTrainingRead,
)
async def approve_training(
    training_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GeneratedTrainingRead:
    t = (
        await db.execute(
            select(GeneratedTraining).where(
                GeneratedTraining.id == training_id,
                GeneratedTraining.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Training not found")
    t.status = "approved"
    t.approved_by_user_id = user.id
    t.approved_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(t)
    return GeneratedTrainingRead.model_validate(t)


@router.post(
    "/trainings/{training_id}/publish",
    response_model=GeneratedTrainingRead,
)
async def publish_training(
    training_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GeneratedTrainingRead:
    t = (
        await db.execute(
            select(GeneratedTraining).where(
                GeneratedTraining.id == training_id,
                GeneratedTraining.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Training not found")
    if t.status == "draft":
        raise HTTPException(
            status_code=400,
            detail="Approve the training before publishing.",
        )
    t.status = "published"
    await db.commit()
    await db.refresh(t)
    return GeneratedTrainingRead.model_validate(t)


@router.delete("/trainings/{training_id}", response_model=GenericMessage)
async def delete_training(
    training_id: int,
    user: Annotated[ElotUser, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> GenericMessage:
    t = (
        await db.execute(
            select(GeneratedTraining).where(
                GeneratedTraining.id == training_id,
                GeneratedTraining.company_id == user.company_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Training not found")
    await db.delete(t)
    await db.commit()
    return GenericMessage(message="Training deleted")
