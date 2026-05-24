"""Onboarding OS — full multi-role onboarding workflow.

Distinct from the simple ``OnboardingPlan`` used by the hiring-conversion
flow. These tables (prefix ``elot_obx_*``) model the richer hire-to-Day-90
operating system: HR-authored templates → per-employee instances → tasks with
assigned_by / reviewer / approval state → multi-source feedback → 30/60/90
reviews → AI risk recommendations → notifications.

Tenant-scoped via ``company_id``. Role is captured at the ``actor_role``
column on every authored row so the audit trail survives even when a user's
role changes later.
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


# ---------------------------------------------------------------------------
# Reference enums (kept as plain strings — validation lives in Pydantic).
# ---------------------------------------------------------------------------
# Role:        super_admin | hr | manager | supervisor | buddy | employee | it
# Stage:       preboarding | day_1 | week_1 | day_30 | day_60 | day_90 | extended
# Category:    compliance | role_training | culture | tools | practical |
#              ai_simulation | manager_review | supervisor_review | buddy_checkin |
#              employee_feedback | it_setup | final_evaluation
# Status:      not_started | in_progress | submitted | needs_review |
#              needs_improvement | approved | failed | overdue | blocked |
#              completed
# Priority:    low | medium | high | critical
# Decision:    approved | needs_improvement | failed
# Visibility:  hr_only | manager | supervisor | employee | all_owners
# Risk:        low | medium | high
# Final:       ready | ready_with_support | extended | needs_pip | not_ready
# Review type: 30_day | 60_day | 90_day | final


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
class OnbTemplate(Base):
    """HR-authored reusable onboarding template."""

    __tablename__ = "elot_obx_template"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    role_name: Mapped[str] = mapped_column(String(120), default="")
    department: Mapped[str] = mapped_column(String(80), default="General")
    duration_days: Mapped[int] = mapped_column(Integer, default=90)
    description: Mapped[str] = mapped_column(Text, default="")
    success_criteria: Mapped[str] = mapped_column(Text, default="")
    required_score: Mapped[int] = mapped_column(Integer, default=70)
    final_approval_required: Mapped[bool] = mapped_column(default=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_user.id"), index=True, default=None
    )
    ai_generated: Mapped[bool] = mapped_column(default=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbTemplateTask(Base):
    """A task slot in a template — cloned into ``OnbTask`` on assignment."""

    __tablename__ = "elot_obx_template_task"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    template_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_template.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[str] = mapped_column(String(40), default="day_1")
    category: Mapped[str] = mapped_column(String(40), default="role_training")
    default_due_day: Mapped[int] = mapped_column(Integer, default=1)
    default_owner_role: Mapped[str] = mapped_column(String(40), default="employee")
    default_reviewer_role: Mapped[str] = mapped_column(String(40), default="hr")
    approval_required: Mapped[bool] = mapped_column(default=False)
    feedback_required: Mapped[bool] = mapped_column(default=False)
    required_score: Mapped[int | None] = mapped_column(Integer, default=None)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    resources_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    quiz_json: Mapped[list | None] = mapped_column(JSON, default=None)
    order_index: Mapped[int] = mapped_column(Integer, default=0)


# ---------------------------------------------------------------------------
# Instances + tasks
# ---------------------------------------------------------------------------
class OnbInstance(Base):
    """A live onboarding for one employee."""

    __tablename__ = "elot_obx_instance"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_obx_template.id"), index=True, default=None
    )
    role_name: Mapped[str] = mapped_column(String(120), default="")
    department: Mapped[str] = mapped_column(String(80), default="General")
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    duration_days: Mapped[int] = mapped_column(Integer, default=90)
    # Managerial chain — Employee IDs to keep one source of truth
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), default=None)
    supervisor_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), default=None)
    buddy_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), default=None)
    it_owner_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), default=None)
    status: Mapped[str] = mapped_column(String(30), default="in_progress")
    # in_progress | completed | extended | needs_pip | failed
    overall_progress: Mapped[int] = mapped_column(Integer, default=0)
    readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    final_decision: Mapped[str | None] = mapped_column(String(40), default=None)
    success_criteria: Mapped[str] = mapped_column(Text, default="")
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbTask(Base):
    """A concrete task on a live instance."""

    __tablename__ = "elot_obx_task"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    # --- Required fields first (dataclass ordering rule) ---
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    # Owner = who must do the work. Canonical workforce table.
    assigned_to_employee_id: Mapped[int] = mapped_column(
        ForeignKey("elot_employee.id"), index=True
    )
    # --- Defaulted fields after ---
    template_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_obx_template_task.id"), index=True, default=None
    )
    description: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[str] = mapped_column(String(40), default="day_1")
    category: Mapped[str] = mapped_column(String(40), default="role_training")
    assigned_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_user.id"), index=True, default=None
    )
    assigned_by_role: Mapped[str] = mapped_column(String(40), default="hr")
    # Reviewer = who must sign off. May be different from manager.
    reviewer_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_employee.id"), index=True, default=None
    )
    reviewer_role: Mapped[str] = mapped_column(String(40), default="hr")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    status: Mapped[str] = mapped_column(String(30), default="not_started")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    approval_required: Mapped[bool] = mapped_column(default=False)
    feedback_required: Mapped[bool] = mapped_column(default=False)
    required_score: Mapped[int | None] = mapped_column(Integer, default=None)
    score: Mapped[int | None] = mapped_column(Integer, default=None)
    resources_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    quiz_json: Mapped[list | None] = mapped_column(JSON, default=None)
    assignment_history_json: Mapped[list] = mapped_column(JSON, default_factory=list)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbTaskSubmission(Base):
    """An employee submission for a task (text + attachment URL)."""

    __tablename__ = "elot_obx_task_submission"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    task_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_task.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    submission_text: Mapped[str] = mapped_column(Text, default="")
    attachment_url: Mapped[str] = mapped_column(String(500), default="")
    quiz_answers_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    auto_score: Mapped[int | None] = mapped_column(Integer, default=None)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


# ---------------------------------------------------------------------------
# Feedback + reviews
# ---------------------------------------------------------------------------
class OnbTaskFeedback(Base):
    """Reviewer feedback on a task — approval / needs_improvement / failed."""

    __tablename__ = "elot_obx_task_feedback"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    # Required fields first
    task_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_task.id"), index=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    to_employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    # Defaulted after
    from_user_id: Mapped[int | None] = mapped_column(ForeignKey("elot_user.id"), default=None)
    from_role: Mapped[str] = mapped_column(String(40), default="hr")
    rating: Mapped[int | None] = mapped_column(Integer, default=None)
    score: Mapped[int | None] = mapped_column(Integer, default=None)
    strengths: Mapped[str] = mapped_column(Text, default="")
    weaknesses: Mapped[str] = mapped_column(Text, default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(30), default="approved")
    rubric_scores_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    visibility: Mapped[str] = mapped_column(String(20), default="all_owners")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbReview(Base):
    """30 / 60 / 90 / final review left by a manager (or HR for final)."""

    __tablename__ = "elot_obx_review"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    review_type: Mapped[str] = mapped_column(String(20))  # 30_day | 60_day | 90_day | final
    reviewer_employee_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), default=None)
    reviewer_user_id: Mapped[int | None] = mapped_column(ForeignKey("elot_user.id"), default=None)
    role_clarity_score: Mapped[int] = mapped_column(Integer, default=0)  # 1-5
    workflow_score: Mapped[int] = mapped_column(Integer, default=0)
    communication_score: Mapped[int] = mapped_column(Integer, default=0)
    ownership_score: Mapped[int] = mapped_column(Integer, default=0)
    productivity_score: Mapped[int] = mapped_column(Integer, default=0)
    culture_score: Mapped[int] = mapped_column(Integer, default=0)
    strengths: Mapped[str] = mapped_column(Text, default="")
    weaknesses: Mapped[str] = mapped_column(Text, default="")
    next_goals: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(40), default="pass")
    # pass | needs_support | fail | ready | ready_with_support | extended | needs_pip | not_ready
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbBuddyCheckIn(Base):
    """Informal weekly check-in from the assigned buddy."""

    __tablename__ = "elot_obx_buddy_checkin"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    buddy_employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    culture_score: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    connection_score: Mapped[int] = mapped_column(Integer, default=3)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbEmployeeFeedback(Base):
    """Self-feedback the new hire leaves on their own experience."""

    __tablename__ = "elot_obx_employee_feedback"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    confidence_score: Mapped[int] = mapped_column(Integer, default=3)
    clarity_score: Mapped[int] = mapped_column(Integer, default=3)
    support_score: Mapped[int] = mapped_column(Integer, default=3)
    comment: Mapped[str] = mapped_column(Text, default="")
    blockers: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


# ---------------------------------------------------------------------------
# AI surface + notifications
# ---------------------------------------------------------------------------
class OnbAIRecommendation(Base):
    """An AI-derived risk note / training recommendation."""

    __tablename__ = "elot_obx_ai_recommendation"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("elot_obx_task.id"), index=True, default=None)
    risk_level: Mapped[str] = mapped_column(String(20), default="low")
    reason: Mapped[str] = mapped_column(Text, default="")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    recommended_training: Mapped[list] = mapped_column(JSON, default_factory=list)
    notify_roles: Mapped[list] = mapped_column(JSON, default_factory=list)
    payload_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


class OnbNotification(Base):
    """In-app notification feed for any role."""

    __tablename__ = "elot_obx_notification"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    # Required fields first
    company_id: Mapped[int] = mapped_column(ForeignKey("elot_company.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    # Defaulted after — notification can target either an ElotUser
    # (HR/manager dashboard) or an Employee (the new hire). Exactly one will
    # be set in practice.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("elot_user.id"), index=True, default=None)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("elot_employee.id"), index=True, default=None)
    message: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(40), default="info")
    # task_assigned | task_due_soon | task_overdue | task_submitted | feedback_left |
    # task_approved | needs_improvement | review_pending | manager_review_due |
    # supervisor_review_pending | hr_approval_needed | high_risk_detected | info
    is_read: Mapped[bool] = mapped_column(default=False, index=True)
    target_url: Mapped[str] = mapped_column(String(500), default="")
    payload_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)


# ---------------------------------------------------------------------------
# Help requests — the new hire pings their buddy / IT / HR for support.
# ---------------------------------------------------------------------------
class OnbHelpRequest(Base):
    """Lightweight 'I need help' ticket routed to a specific role."""

    __tablename__ = "elot_obx_help_request"

    id: Mapped[int] = mapped_column(Integer, autoincrement=True, primary_key=True, init=False)
    # Required fields first
    instance_id: Mapped[int] = mapped_column(ForeignKey("elot_obx_instance.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("elot_employee.id"), index=True)
    target_role: Mapped[str] = mapped_column(String(20))  # buddy | hr | manager | it | supervisor
    message: Mapped[str] = mapped_column(Text)
    # Defaulted after
    task_id: Mapped[int | None] = mapped_column(ForeignKey("elot_obx_task.id"), default=None, index=True)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | responded | closed
    response_text: Mapped[str] = mapped_column(Text, default="")
    responded_by_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("elot_employee.id"), default=None
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=_utcnow)
