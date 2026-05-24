"""ELOT security-awareness domain models.

Separate from ``models/elot.py`` so the threat-feed feature stays self-contained.
All tables are tenant-scoped via ``company_id`` except ``threat_source``,
``threat_report`` and ``threat_trend`` which are global (one feed serves many
companies).
"""

from __future__ import annotations

import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import JSON, UUID, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ThreatSource(Base):
    """A feed we monitor for phishing-awareness intel (RSS / API / sample)."""

    __tablename__ = "elot_threat_source"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    name: Mapped[str] = mapped_column(String(120))
    source_type: Mapped[str] = mapped_column(String(40), default="sample")
    url: Mapped[str] = mapped_column(String(500), default="")
    enabled: Mapped[bool] = mapped_column(default=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class ThreatReport(Base):
    """A single article/advisory fetched from a source.

    ``raw_content`` and ``summary`` are stored already-defanged so the data is
    safe to show inside the product even before it reaches the AI summariser.
    """

    __tablename__ = "elot_threat_report"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    source_id: Mapped[int] = mapped_column(ForeignKey("elot_threat_source.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text, default="")
    raw_content: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    source_url: Mapped[str] = mapped_column(String(500), default="")
    confidence_score: Mapped[int] = mapped_column(Integer, default=50)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class ThreatTrend(Base):
    """Structured, AI-summarised view of a report — the safe internal record."""

    __tablename__ = "elot_threat_trend"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    report_id: Mapped[int | None] = mapped_column(ForeignKey("elot_threat_report.id"), index=True, default=None)
    title: Mapped[str] = mapped_column(String(300), default="")
    method: Mapped[str] = mapped_column(String(80), default="")  # e.g. Quishing
    channel: Mapped[str] = mapped_column(String(200), default="")  # e.g. Email, PDF, SMS
    target_roles_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    red_flags_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    safe_response_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    risk_level: Mapped[str] = mapped_column(String(20), default="medium")
    ai_summary_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class GeneratedTraining(Base):
    """An AI-generated security micro-training, gated by admin review."""

    __tablename__ = "elot_generated_training"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    trend_id: Mapped[int] = mapped_column(ForeignKey("elot_threat_trend.id"), index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    lesson_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    quiz_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    scenario_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | approved | published
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("elot_user.id"), index=True, default=None)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class PhishingTest(Base):
    """A safe in-app phishing challenge derived from a generated training."""

    __tablename__ = "elot_phishing_test"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    # Required fields first (dataclass ordering rule)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    # Defaulted fields after
    training_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_generated_training.id"), index=True, default=None
    )
    test_type: Mapped[str] = mapped_column(String(40), default="in_app")  # in_app | email_simulation
    scenario_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    status: Mapped[str] = mapped_column(String(20), default="active")  # draft | active | archived
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class PhishingTestResult(Base):
    """One employee's response to a phishing test."""

    __tablename__ = "elot_phishing_test_result"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    test_id: Mapped[int] = mapped_column(ForeignKey("elot_phishing_test.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    action: Mapped[str] = mapped_column(String(40))
    # opened | clicked | reported | answered_correctly | answered_risky
    answer: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    feedback_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
