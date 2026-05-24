"""ELOT hiring + onboarding domain models.

Covers the full Hire-to-Onboard workflow: JobRole, Candidate, training,
AI interview, scorecard, post-hire onboarding plan. AI never makes the final
hire decision — see Responsible AI notes.
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


class JobRole(Base):
    """A role HR is hiring for + AI-generated training/interview/onboarding plans."""

    __tablename__ = "elot_job_role"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    department: Mapped[str] = mapped_column(String(80), default="General")
    seniority: Mapped[str] = mapped_column(String(40), default="Junior")
    required_skills_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    training_map_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    interview_plan_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    assessment_plan_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    rubric_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    onboarding_plan_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    role_profile_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    responsible_ai_notes_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Candidate(Base):
    __tablename__ = "elot_candidate"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    job_role_id: Mapped[int] = mapped_column(ForeignKey("elot_job_role.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(160), index=True)
    # Status pipeline
    status: Mapped[str] = mapped_column(String(40), default="applied")
    # Numeric tracking
    training_progress: Mapped[int] = mapped_column(Integer, default=0)  # 0–100
    ai_interview_score: Mapped[int] = mapped_column(Integer, default=0)
    assessment_score: Mapped[int] = mapped_column(Integer, default=0)
    readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    recommendation: Mapped[str] = mapped_column(String(40), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    hired_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_employee.id"), index=True, default=None
    )
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class CandidateTrainingModule(Base):
    """One pre-hire training module assigned to a candidate."""

    __tablename__ = "elot_candidate_training_module"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("elot_candidate.id"), index=True)
    job_role_id: Mapped[int] = mapped_column(ForeignKey("elot_job_role.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    quiz_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    score: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class CandidateQuizAttempt(Base):
    __tablename__ = "elot_candidate_quiz_attempt"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("elot_candidate.id"), index=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("elot_candidate_training_module.id"), index=True)
    answers_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    score: Mapped[int] = mapped_column(Integer, default=0)
    feedback_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class AIInterview(Base):
    """A multi-turn chat interview between a candidate and the AI interviewer."""

    __tablename__ = "elot_ai_interview"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("elot_candidate.id"), index=True)
    job_role_id: Mapped[int] = mapped_column(ForeignKey("elot_job_role.id"), index=True)
    interview_questions_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    transcript_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    score_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    recommendation: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress | completed
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class CandidateScorecard(Base):
    __tablename__ = "elot_candidate_scorecard"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("elot_candidate.id"), index=True)
    job_role_id: Mapped[int] = mapped_column(ForeignKey("elot_job_role.id"), index=True)
    overall_readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    strengths_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    weaknesses_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    skill_scores_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    risk_flags_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    suggested_hr_questions_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    recommended_next_step: Mapped[str] = mapped_column(String(40), default="needs_more_review")
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    responsible_ai_note: Mapped[str] = mapped_column(
        Text,
        default=(
            "This is an AI-generated recommendation for HR review, "
            "not an automated hiring decision."
        ),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnboardingPlan(Base):
    """Post-hire onboarding plan — assigned automatically once a candidate is hired."""

    __tablename__ = "elot_onboarding_plan"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    source_candidate_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_candidate.id"), index=True, default=None
    )
    modules_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    manager_checklist_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    status: Mapped[str] = mapped_column(String(20), default="active")
    readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
