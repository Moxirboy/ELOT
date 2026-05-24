"""Pydantic schemas for the Onboarding OS."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Stage = Literal[
    "preboarding", "day_1", "week_1", "day_30", "day_60", "day_90", "extended"
]
Category = Literal[
    "compliance",
    "role_training",
    "culture",
    "tools",
    "practical",
    "ai_simulation",
    "manager_review",
    "supervisor_review",
    "buddy_checkin",
    "employee_feedback",
    "it_setup",
    "final_evaluation",
]
Status = Literal[
    "not_started",
    "in_progress",
    "submitted",
    "needs_review",
    "needs_improvement",
    "approved",
    "failed",
    "overdue",
    "blocked",
    "completed",
]
Priority = Literal["low", "medium", "high", "critical"]
Decision = Literal["approved", "needs_improvement", "failed"]
Visibility = Literal["hr_only", "manager", "supervisor", "employee", "all_owners"]
Risk = Literal["low", "medium", "high"]
ReviewType = Literal["30_day", "60_day", "90_day", "final"]
ReviewDecision = Literal[
    "pass",
    "needs_support",
    "fail",
    "ready",
    "ready_with_support",
    "extended",
    "needs_pip",
    "not_ready",
]
ActorRole = Literal[
    "super_admin", "hr", "manager", "supervisor", "buddy", "employee", "it"
]


# ---------- Template ----------
class TemplateTaskCreate(BaseModel):
    title: str
    description: str = ""
    stage: Stage = "day_1"
    category: Category = "role_training"
    default_due_day: int = 1
    default_owner_role: ActorRole = "employee"
    default_reviewer_role: ActorRole = "hr"
    approval_required: bool = False
    feedback_required: bool = False
    required_score: int | None = None
    priority: Priority = "medium"
    resources: list[dict[str, Any]] = Field(default_factory=list)
    quiz: list[dict[str, Any]] | None = None
    order_index: int = 0


class TemplateTaskRead(TemplateTaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    template_id: int


class TemplateCreate(BaseModel):
    name: str
    role_name: str = ""
    department: str = "General"
    duration_days: int = 90
    description: str = ""
    success_criteria: str = ""
    required_score: int = 70
    final_approval_required: bool = True
    tasks: list[TemplateTaskCreate] = Field(default_factory=list)


class TemplateUpdate(BaseModel):
    name: str | None = None
    role_name: str | None = None
    department: str | None = None
    duration_days: int | None = None
    description: str | None = None
    success_criteria: str | None = None
    required_score: int | None = None
    final_approval_required: bool | None = None
    is_active: bool | None = None


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    name: str
    role_name: str
    department: str
    duration_days: int
    description: str
    success_criteria: str
    required_score: int
    final_approval_required: bool
    is_active: bool
    ai_generated: bool
    created_at: datetime
    updated_at: datetime


class TemplateDetail(TemplateRead):
    tasks: list[TemplateTaskRead] = Field(default_factory=list)


class TemplateAIGenerateRequest(BaseModel):
    role_name: str
    department: str = "General"
    duration_days: int = 90
    description: str
    company_context: str = ""
    required_score: int = 70


# ---------- Instance ----------
class InstanceCreate(BaseModel):
    employee_id: int
    template_id: int | None = None
    role_name: str = ""
    department: str = "General"
    duration_days: int = 90
    start_date: datetime | None = None
    manager_id: int | None = None
    supervisor_id: int | None = None
    buddy_id: int | None = None
    it_owner_id: int | None = None
    success_criteria: str = ""


class InstanceUpdate(BaseModel):
    manager_id: int | None = None
    supervisor_id: int | None = None
    buddy_id: int | None = None
    it_owner_id: int | None = None
    status: str | None = None
    final_decision: str | None = None


class InstanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    employee_id: int
    template_id: int | None
    role_name: str
    department: str
    start_date: datetime
    end_date: datetime | None
    duration_days: int
    manager_id: int | None
    supervisor_id: int | None
    buddy_id: int | None
    it_owner_id: int | None
    status: str
    overall_progress: int
    readiness_score: int
    risk_level: str
    final_decision: str | None
    success_criteria: str
    created_at: datetime
    updated_at: datetime


class InstanceCard(InstanceRead):
    """Adds joined-in fields for dashboards."""

    employee_name: str | None = None
    manager_name: str | None = None
    supervisor_name: str | None = None
    buddy_name: str | None = None
    open_tasks: int = 0
    overdue_tasks: int = 0
    pending_reviews: int = 0
    current_stage: str = "day_1"


# ---------- Tasks ----------
class TaskCreate(BaseModel):
    title: str
    description: str = ""
    stage: Stage = "day_1"
    category: Category = "role_training"
    assigned_by_role: ActorRole = "hr"
    assigned_to_employee_id: int
    reviewer_employee_id: int | None = None
    reviewer_role: ActorRole = "hr"
    due_date: datetime | None = None
    priority: Priority = "medium"
    approval_required: bool = False
    feedback_required: bool = False
    required_score: int | None = None
    resources: list[dict[str, Any]] = Field(default_factory=list)
    quiz: list[dict[str, Any]] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    reviewer_employee_id: int | None = None
    reviewer_role: ActorRole | None = None
    due_date: datetime | None = None
    priority: Priority | None = None
    status: Status | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    title: str
    description: str
    stage: str
    category: str
    assigned_by_user_id: int | None
    assigned_by_role: str
    assigned_to_employee_id: int
    reviewer_employee_id: int | None
    reviewer_role: str
    due_date: datetime | None
    status: str
    priority: str
    approval_required: bool
    feedback_required: bool
    required_score: int | None
    score: int | None
    resources_json: list
    quiz_json: list | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Joined display fields
    assigned_by_name: str | None = None
    assigned_to_name: str | None = None
    reviewer_name: str | None = None


# ---------- Submissions & feedback ----------
class TaskSubmissionCreate(BaseModel):
    submission_text: str = ""
    attachment_url: str = ""
    quiz_answers: dict[str, Any] | None = None


class TaskSubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    employee_id: int
    submission_text: str
    attachment_url: str
    quiz_answers_json: dict | None
    auto_score: int | None
    submitted_at: datetime


class TaskFeedbackCreate(BaseModel):
    decision: Decision = "approved"
    rating: int | None = None
    score: int | None = None
    strengths: str = ""
    weaknesses: str = ""
    comment: str = ""
    rubric_scores: dict[str, int] | None = None
    visibility: Visibility = "all_owners"
    from_role: ActorRole = "hr"


class TaskFeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    instance_id: int
    from_user_id: int | None
    from_role: str
    to_employee_id: int
    rating: int | None
    score: int | None
    strengths: str
    weaknesses: str
    comment: str
    decision: str
    rubric_scores_json: dict | None
    visibility: str
    created_at: datetime
    from_name: str | None = None


# ---------- Reviews / buddy / employee feedback ----------
class ReviewCreate(BaseModel):
    review_type: ReviewType
    role_clarity_score: int = 0
    workflow_score: int = 0
    communication_score: int = 0
    ownership_score: int = 0
    productivity_score: int = 0
    culture_score: int = 0
    strengths: str = ""
    weaknesses: str = ""
    next_goals: str = ""
    decision: ReviewDecision = "pass"


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    review_type: str
    reviewer_employee_id: int | None
    reviewer_user_id: int | None
    role_clarity_score: int
    workflow_score: int
    communication_score: int
    ownership_score: int
    productivity_score: int
    culture_score: int
    strengths: str
    weaknesses: str
    next_goals: str
    decision: str
    created_at: datetime
    reviewer_name: str | None = None


class BuddyCheckInCreate(BaseModel):
    culture_score: int = 3
    connection_score: int = 3
    comment: str = ""


class BuddyCheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    buddy_employee_id: int
    employee_id: int
    culture_score: int
    connection_score: int
    comment: str
    created_at: datetime
    buddy_name: str | None = None


class EmployeeFeedbackCreate(BaseModel):
    confidence_score: int = 3
    clarity_score: int = 3
    support_score: int = 3
    comment: str = ""
    blockers: str = ""


class EmployeeFeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    employee_id: int
    confidence_score: int
    clarity_score: int
    support_score: int
    comment: str
    blockers: str
    created_at: datetime


# ---------- AI ----------
class AIRecommendationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    task_id: int | None
    risk_level: str
    reason: str
    recommended_action: str
    recommended_training: list[str]
    notify_roles: list[str]
    created_at: datetime


class MentorQuestion(BaseModel):
    question: str


class MentorAnswer(BaseModel):
    answer: str
    sources: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"


# ---------- Notifications ----------
class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    target_url: str
    created_at: datetime


# ---------- Dashboards ----------
class HRDashboard(BaseModel):
    total_active: int
    completed: int
    average_progress: float
    average_readiness: float
    overdue_tasks: int
    pending_approvals: int
    compliance_completion_rate: float
    high_risk_count: int
    manager_reviews_pending: int
    supervisor_reviews_pending: int
    employee_satisfaction: float
    instances: list[InstanceCard]


class ManagerDashboard(BaseModel):
    manager_id: int
    manager_name: str
    new_hires: list[InstanceCard]
    pending_reviews: int
    overdue_tasks: int
    high_risk_count: int


class SupervisorDashboard(BaseModel):
    supervisor_id: int
    supervisor_name: str
    new_hires: list[InstanceCard]
    pending_review_tasks: list[TaskRead]
    overdue_tasks: int
    avg_practical_score: float


class BuddyDashboard(BaseModel):
    buddy_id: int
    buddy_name: str
    new_hires: list[InstanceCard]
    recent_checkins: list[BuddyCheckInRead]
    last_checkin_by_instance: dict[int, datetime | None] = Field(default_factory=dict)
    open_help_requests: int = 0
    at_risk_hires: int = 0


class ITDashboard(BaseModel):
    it_id: int
    it_name: str
    new_hires: list[InstanceCard]
    pending_setup_tasks: list[TaskRead]
    completed_setup_tasks: int
    overdue_tasks: int
    blocked_tasks: int = 0
    due_today: int = 0
    completed_this_week: int = 0


# ---------- Help requests ----------
HelpTargetRole = Literal["buddy", "hr", "manager", "it", "supervisor"]
HelpStatus = Literal["open", "responded", "closed"]


class HelpRequestCreate(BaseModel):
    target_role: HelpTargetRole
    message: str
    task_id: int | None = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"


class HelpRequestRespond(BaseModel):
    response_text: str
    close: bool = False


class HelpRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instance_id: int
    employee_id: int
    target_role: str
    message: str
    task_id: int | None
    status: str
    response_text: str
    responded_by_employee_id: int | None
    responded_at: datetime | None
    priority: str
    created_at: datetime
    employee_name: str | None = None
    responder_name: str | None = None


# ---------- IT task actions ----------
class ITTaskBlock(BaseModel):
    reason: str
    note: str | None = None


class ITTaskComplete(BaseModel):
    note: str | None = None
    asset_id: str | None = None
    score: int | None = None


class ITTaskStatusUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "blocked", "completed", "overdue"]
    note: str | None = None
    block_reason: str | None = None
    asset_id: str | None = None


class ITSetupItem(BaseModel):
    """One row of an employee's IT setup checklist."""

    task_id: int
    title: str
    status: str
    due_date: datetime | None
    blocker_reason: str | None = None
    completed_at: datetime | None = None
    asset_id: str | None = None
    reviewer_name: str | None = None


class ITSetupForEmployee(BaseModel):
    employee_id: int
    employee_name: str
    instance_id: int | None
    items: list[ITSetupItem]
    completion_rate: float


class EmployeeTimeline(BaseModel):
    instance: InstanceRead
    employee_name: str
    manager_name: str | None
    supervisor_name: str | None
    buddy_name: str | None
    current_stage: str
    stages: list[dict[str, Any]]
    next_tasks: list[TaskRead]
    overdue_tasks: list[TaskRead]
    completed_count: int
    total_count: int


class FinalReport(BaseModel):
    instance: InstanceRead
    employee_name: str
    completed_tasks: int
    incomplete_tasks: int
    compliance_complete: bool
    quiz_average: float
    practical_average: float
    manager_reviews: list[ReviewRead]
    supervisor_feedback_count: int
    buddy_checkins: list[BuddyCheckInRead]
    employee_feedback: list[EmployeeFeedbackRead]
    strengths: list[str]
    weaknesses: list[str]
    risk_history: list[AIRecommendationRead]
    ai_recommendation: str
    final_decision: str
    next_development_plan: list[str]


# ---------- Misc ----------
class GenericMessage(BaseModel):
    message: str


class AssignManagerRequest(BaseModel):
    manager_id: int | None = None
    supervisor_id: int | None = None
    buddy_id: int | None = None
    it_owner_id: int | None = None
