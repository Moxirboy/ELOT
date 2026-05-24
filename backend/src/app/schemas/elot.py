"""ELOT AI Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["admin", "learner", "manager", "supervisor", "buddy", "it"]
Risk = Literal["low", "medium", "high"]
Status = Literal["not_started", "in_progress", "completed", "overdue"]
Difficulty = Literal["beginner", "intermediate", "advanced"]
Language = Literal["English", "Uzbek", "Russian"]


# ---------- Company ----------
class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    industry: str
    created_at: datetime


# ---------- Auth ----------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MeResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: Role
    company_id: int
    employee_id: int | None = None


# ---------- Employee ----------
class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    department: str = "General"
    job_role: str = "Employee"
    risk_level: Risk = "low"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    job_role: str | None = None
    risk_level: Risk | None = None


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    created_at: datetime


# ---------- Policy ----------
class PolicyBase(BaseModel):
    title: str
    content: str
    language: Language = "English"


class PolicyCreate(PolicyBase):
    pass


class PolicyRead(PolicyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    created_at: datetime


# ---------- AI inputs/outputs ----------
class GenerateCourseRequest(BaseModel):
    policy_title: str
    policy_text: str
    language: Language = "English"
    audience: str = "All Employees"


class LessonAI(BaseModel):
    title: str
    content: str
    key_takeaway: str = ""
    role_based_examples: dict[str, str] = Field(default_factory=dict, alias="roleBasedExamples")
    model_config = ConfigDict(populate_by_name=True)


class ScenarioAI(BaseModel):
    title: str
    situation: str
    question: str
    ideal_answer: str = Field(default="", alias="idealAnswer")
    risk_level: Risk = Field(default="medium", alias="riskLevel")
    policy_reference: str = Field(default="", alias="policyReference")
    model_config = ConfigDict(populate_by_name=True)


class QuizAI(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str = Field(default="", alias="correctAnswer")
    explanation: str = ""
    topic: str = "General"
    model_config = ConfigDict(populate_by_name=True)


class GeneratedCourse(BaseModel):
    title: str
    description: str
    estimated_minutes: int = Field(default=10, alias="estimatedMinutes")
    difficulty: Difficulty = "beginner"
    learning_objectives: list[str] = Field(default_factory=list, alias="learningObjectives")
    lessons: list[LessonAI] = Field(default_factory=list)
    scenarios: list[ScenarioAI] = Field(default_factory=list)
    quiz: list[QuizAI] = Field(default_factory=list)
    certificate_title: str = Field(default="", alias="certificateTitle")
    limitations: list[str] = Field(default_factory=list)
    model_config = ConfigDict(populate_by_name=True)


class GenerateCourseResponse(BaseModel):
    course: GeneratedCourse


# ---------- Course ----------
class CourseCreate(BaseModel):
    title: str
    description: str = ""
    estimated_minutes: int = 10
    difficulty: Difficulty = "beginner"
    language: Language = "English"
    generated_json: dict | None = None
    policy_id: int | None = None


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    estimated_minutes: int | None = None
    difficulty: Difficulty | None = None


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    policy_id: int | None
    title: str
    description: str
    estimated_minutes: int
    difficulty: str
    language: str
    generated_json: dict | None
    created_at: datetime


class CourseDetail(CourseRead):
    lessons: list[dict] = Field(default_factory=list)
    scenarios: list[dict] = Field(default_factory=list)
    quiz: list[dict] = Field(default_factory=list)


# ---------- Assignment ----------
class AssignmentCreate(BaseModel):
    course_id: int
    employee_ids: list[int] = Field(default_factory=list)
    department: str | None = None  # optional bulk assign by department
    due_date: datetime | None = None


class AssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    employee_id: int
    course_id: int
    status: str
    score: int
    risk_level: str
    due_date: datetime | None
    completed_at: datetime | None
    created_at: datetime


class AssignmentStatusUpdate(BaseModel):
    score: int | None = None
    risk_level: Risk | None = None


# ---------- Scenario evaluation ----------
class EvaluateScenarioRequest(BaseModel):
    course_id: int
    scenario_id: int
    employee_id: int
    user_answer: str


class ScenarioFeedback(BaseModel):
    is_correct: bool = Field(alias="isCorrect")
    score: int
    risk_level: Risk = Field(alias="riskLevel")
    feedback: str
    better_answer: str = Field(default="", alias="betterAnswer")
    policy_reference: str = Field(default="", alias="policyReference")
    coaching_tip: str = Field(default="", alias="coachingTip")
    model_config = ConfigDict(populate_by_name=True)


# ---------- Admin dashboard ----------
class DepartmentStat(BaseModel):
    department: str
    completion_rate: float
    average_score: float
    high_risk: int


class WeakTopic(BaseModel):
    topic: str
    average_score: float
    attempts: int


class RecentCompletion(BaseModel):
    employee_name: str
    course_title: str
    completed_at: datetime
    score: int


class AdminDashboard(BaseModel):
    total_employees: int
    total_courses: int
    completion_rate: float
    average_score: float
    high_risk_count: int
    overdue_count: int
    weakest_topics: list[WeakTopic]
    department_stats: list[DepartmentStat]
    recent_completions: list[RecentCompletion]


# ---------- Admin copilot ----------
class CopilotRequest(BaseModel):
    question: str


class CopilotResponse(BaseModel):
    answer: str
    evidence: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    draft_message: str = ""


# ---------- Certificate ----------
class CertificateCreate(BaseModel):
    employee_id: int
    course_id: int


class CertificateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    course_id: int
    certificate_id: str
    issued_at: datetime
    employee_name: str | None = None
    course_title: str | None = None
    score: int | None = None


# ---------- Learner ----------
class LearnerCourseListItem(BaseModel):
    assignment_id: int
    course_id: int
    title: str
    description: str
    estimated_minutes: int
    status: str
    score: int
    risk_level: str
    due_date: datetime | None
    completed_at: datetime | None


class LearnerDashboard(BaseModel):
    employee_id: int
    employee_name: str
    department: str
    completed: int
    in_progress: int
    not_started: int
    overdue: int
    courses: list[LearnerCourseListItem]
    certificates: list[CertificateRead]


# Generic helpers
class GenericMessage(BaseModel):
    message: str


class ListResponse(BaseModel):
    data: list[Any]
    total: int
