"""Pydantic schemas for the threat-feed / phishing-awareness module."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Risk = Literal["low", "medium", "high"]
TestType = Literal["in_app", "email_simulation"]
TrainingStatus = Literal["draft", "approved", "published"]
ResultAction = Literal[
    "opened",
    "clicked",
    "reported",
    "answered_correctly",
    "answered_risky",
]


# ---------- Sources ----------
class ThreatSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    source_type: str
    url: str
    enabled: bool
    last_checked_at: datetime | None
    created_at: datetime


class ThreatSourceCreate(BaseModel):
    name: str
    source_type: str = "sample"
    url: str = ""
    enabled: bool = True


# ---------- Reports ----------
class ThreatReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_id: int
    title: str
    summary: str
    published_at: datetime | None
    source_url: str
    confidence_score: int
    created_at: datetime


# ---------- Trends ----------
class TrendSummary(BaseModel):
    """The safe AI summary stored on a trend."""

    title: str
    method: str
    channel: str
    target_users: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    safe_response: list[str] = Field(default_factory=list)
    training_recommendation: str = ""


class ThreatTrendRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_id: int | None
    title: str
    method: str
    channel: str
    target_roles_json: list[str]
    red_flags_json: list[str]
    safe_response_json: list[str]
    risk_level: Risk
    ai_summary_json: dict | None
    created_at: datetime


# ---------- Generated trainings ----------
class GeneratedTrainingLesson(BaseModel):
    title: str = ""
    summary: str = ""
    lesson: str = ""
    red_flags: list[str] = Field(default_factory=list, alias="redFlags")
    safe_actions: list[str] = Field(default_factory=list, alias="safeActions")
    admin_notes: str = Field(default="", alias="adminNotes")
    limitations: list[str] = Field(default_factory=list)
    model_config = ConfigDict(populate_by_name=True, extra="allow")


class GeneratedTrainingScenario(BaseModel):
    message: str
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str = Field(default="", alias="correctAnswer")
    explanation: str = ""
    model_config = ConfigDict(populate_by_name=True)


class GeneratedTrainingQuiz(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str = Field(default="", alias="correctAnswer")
    explanation: str = ""
    model_config = ConfigDict(populate_by_name=True)


class GeneratedTrainingPayload(BaseModel):
    title: str
    summary: str
    lesson: str
    red_flags: list[str] = Field(default_factory=list, alias="redFlags")
    safe_actions: list[str] = Field(default_factory=list, alias="safeActions")
    scenario: GeneratedTrainingScenario
    quiz: list[GeneratedTrainingQuiz] = Field(default_factory=list)
    admin_notes: str = Field(default="", alias="adminNotes")
    limitations: list[str] = Field(default_factory=list)
    model_config = ConfigDict(populate_by_name=True)


class GeneratedTrainingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    trend_id: int
    title: str
    lesson_json: dict | None
    quiz_json: list
    scenario_json: dict | None
    status: TrainingStatus
    approved_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime


# ---------- Phishing tests ----------
class PhishingTestCreate(BaseModel):
    title: str
    training_id: int | None = None
    test_type: TestType = "in_app"
    scenario_json: dict | None = None
    scheduled_at: datetime | None = None


class PhishingTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    training_id: int | None
    title: str
    test_type: str
    scenario_json: dict | None
    status: str
    scheduled_at: datetime | None
    created_at: datetime


class PhishingTestAnswer(BaseModel):
    employee_id: int
    answer: str
    elapsed_ms: int | None = None
    action: ResultAction | None = None


class PhishingTestResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_id: int
    employee_id: int
    action: str
    answer: str
    score: int
    risk_level: Risk
    feedback_json: dict | None
    created_at: datetime
    employee_name: str | None = None


# ---------- Security dashboard ----------
class SecurityDeptStat(BaseModel):
    department: str
    correct: int
    risky: int
    average_score: float
    high_risk_employees: int


class SecurityEmployeeRisk(BaseModel):
    employee_id: int
    name: str
    department: str
    risk_level: Risk
    risky_actions: int
    correct_actions: int
    average_score: float


class SecurityAwarenessDashboard(BaseModel):
    active_trends: int
    drafts: int
    published_trainings: int
    tests_run: int
    correct_rate: float
    average_response_score: float
    department_stats: list[SecurityDeptStat]
    riskiest_employees: list[SecurityEmployeeRisk]
    weak_methods: list[dict[str, Any]]


# Sync + util
class SyncResponse(BaseModel):
    fetched_reports: int
    new_trends: int
    sources_used: list[str]
    used_sample_fallback: bool


class GenericMessage(BaseModel):
    message: str
