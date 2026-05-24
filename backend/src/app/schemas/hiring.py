"""Pydantic schemas for the hire-to-onboard module."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Status = Literal[
    "applied",
    "training_assigned",
    "training_completed",
    "ai_interview_completed",
    "hr_review",
    "hr_interview",
    "hired",
    "rejected",
]
Recommendation = Literal[
    "invite_to_hr_interview", "needs_more_review", "not_ready", ""
]
SkillCategory = Literal[
    "technical", "communication", "policy", "culture", "security", "domain"
]
SkillImportance = Literal["low", "medium", "high"]
OnboardingModuleType = Literal[
    "company_structure",
    "role_training",
    "security",
    "harassment",
    "data_privacy",
    "ai_usage",
    "policy",
    "other",
]


# -------------- AI inputs / outputs --------------
class GenerateRolePlanRequest(BaseModel):
    title: str
    department: str = "General"
    seniority: str = "Junior"
    role_description: str
    language_requirements: list[str] = Field(default_factory=list)
    company_notes: str = ""


class RoleProfile(BaseModel):
    title: str
    department: str = ""
    seniority: str = ""
    summary: str = ""
    ideal_candidate: str = Field(default="", alias="idealCandidate")
    success_outcomes: list[str] = Field(default_factory=list, alias="successOutcomes")
    model_config = ConfigDict(populate_by_name=True)


class RequiredSkill(BaseModel):
    name: str
    category: SkillCategory = "communication"
    importance: SkillImportance = "medium"
    description: str = ""


class TrainingQuiz(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str = Field(default="", alias="correctAnswer")
    explanation: str = ""
    model_config = ConfigDict(populate_by_name=True)


class TrainingMapItem(BaseModel):
    title: str
    description: str = ""
    content: str = ""
    quiz: list[TrainingQuiz] = Field(default_factory=list)


class InterviewPlanItem(BaseModel):
    question: str
    skill_tested: str = Field(default="", alias="skillTested")
    good_answer_signals: list[str] = Field(default_factory=list, alias="goodAnswerSignals")
    red_flags: list[str] = Field(default_factory=list, alias="redFlags")
    score_weight: int = Field(default=10, alias="scoreWeight")
    model_config = ConfigDict(populate_by_name=True)


class AssessmentPlanItem(BaseModel):
    task_title: str = Field(default="", alias="taskTitle")
    task_description: str = Field(default="", alias="taskDescription")
    evaluation_criteria: list[str] = Field(default_factory=list, alias="evaluationCriteria")
    model_config = ConfigDict(populate_by_name=True)


class RubricCategory(BaseModel):
    name: str
    weight: int = 10
    description: str = ""


class Rubric(BaseModel):
    categories: list[RubricCategory] = Field(default_factory=list)
    passing_score: int = Field(default=60, alias="passingScore")
    model_config = ConfigDict(populate_by_name=True)


class OnboardingPlanItem(BaseModel):
    title: str
    description: str = ""
    type: OnboardingModuleType = "other"


class GeneratedRolePlan(BaseModel):
    role_profile: RoleProfile = Field(alias="roleProfile")
    required_skills: list[RequiredSkill] = Field(default_factory=list, alias="requiredSkills")
    training_map: list[TrainingMapItem] = Field(default_factory=list, alias="trainingMap")
    interview_plan: list[InterviewPlanItem] = Field(default_factory=list, alias="interviewPlan")
    assessment_plan: list[AssessmentPlanItem] = Field(default_factory=list, alias="assessmentPlan")
    rubric: Rubric = Field(default_factory=Rubric)
    onboarding_plan: list[OnboardingPlanItem] = Field(default_factory=list, alias="onboardingPlan")
    responsible_ai_notes: list[str] = Field(default_factory=list, alias="responsibleAINotes")
    model_config = ConfigDict(populate_by_name=True)


# -------------- Job role CRUD --------------
class JobRoleCreate(BaseModel):
    title: str
    description: str = ""
    department: str = "General"
    seniority: str = "Junior"
    required_skills_json: list[dict] = Field(default_factory=list)
    training_map_json: list[dict] = Field(default_factory=list)
    interview_plan_json: list[dict] = Field(default_factory=list)
    assessment_plan_json: list[dict] = Field(default_factory=list)
    rubric_json: dict | None = None
    onboarding_plan_json: list[dict] = Field(default_factory=list)
    role_profile_json: dict | None = None
    responsible_ai_notes_json: list[str] = Field(default_factory=list)


class JobRoleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    department: str | None = None
    seniority: str | None = None
    required_skills_json: list[dict] | None = None
    training_map_json: list[dict] | None = None
    interview_plan_json: list[dict] | None = None
    assessment_plan_json: list[dict] | None = None
    rubric_json: dict | None = None
    onboarding_plan_json: list[dict] | None = None


class JobRoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    title: str
    description: str
    department: str
    seniority: str
    required_skills_json: list
    training_map_json: list
    interview_plan_json: list
    assessment_plan_json: list
    rubric_json: dict | None
    onboarding_plan_json: list
    role_profile_json: dict | None
    responsible_ai_notes_json: list
    created_at: datetime
    updated_at: datetime | None


# -------------- Candidate CRUD --------------
class CandidateCreate(BaseModel):
    job_role_id: int
    full_name: str
    email: EmailStr
    notes: str = ""


class CandidateUpdate(BaseModel):
    status: Status | None = None
    notes: str | None = None
    ai_interview_score: int | None = None
    assessment_score: int | None = None


class CandidateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    job_role_id: int
    full_name: str
    email: str
    status: str
    training_progress: int
    ai_interview_score: int
    assessment_score: int
    readiness_score: int
    recommendation: str
    notes: str
    hired_employee_id: int | None
    created_at: datetime
    updated_at: datetime | None
    # Convenience joined fields
    role_title: str | None = None


# -------------- Candidate portal --------------
class CandidateModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    job_role_id: int
    title: str
    description: str
    content: str
    quiz_json: list
    order_index: int
    status: str
    score: int
    completed_at: datetime | None


class CandidateDashboard(BaseModel):
    candidate: CandidateRead
    role: JobRoleRead
    modules: list[CandidateModuleRead]
    ai_interview_status: str
    ai_interview_question_count: int
    next_action: str


class CandidateQuizSubmission(BaseModel):
    answers: list[str]


class CandidateQuizResult(BaseModel):
    score: int
    correct: int
    total: int
    feedback: list[dict]


# -------------- AI interview --------------
class StartInterviewResponse(BaseModel):
    interview_id: int
    question_number: int
    total_questions: int
    question: str
    skill_tested: str = ""
    why_this_matters: str = ""


class SubmitInterviewAnswer(BaseModel):
    answer: str


class InterviewTurnFeedback(BaseModel):
    score: int
    skill_scores: list[dict] = Field(default_factory=list, alias="skillScores")
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list, alias="redFlags")
    better_answer_example: str = Field(default="", alias="betterAnswerExample")
    hr_review_note: str = Field(default="", alias="hrReviewNote")
    model_config = ConfigDict(populate_by_name=True)


class SubmitInterviewAnswerResponse(BaseModel):
    feedback: InterviewTurnFeedback
    next_question: StartInterviewResponse | None
    is_complete: bool


class InterviewTranscriptTurn(BaseModel):
    role: Literal["interviewer", "candidate", "feedback"]
    text: str
    skill_tested: str = ""
    score: int | None = None


class InterviewSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    job_role_id: int
    transcript_json: list
    score_json: list
    overall_score: int
    recommendation: str
    status: str
    finished_at: datetime | None
    created_at: datetime


# -------------- Scorecard --------------
class GeneratedScorecard(BaseModel):
    overall_readiness_score: int = Field(default=0, alias="overallReadinessScore")
    recommendation: Recommendation = "needs_more_review"
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    skill_scores: list[dict] = Field(default_factory=list, alias="skillScores")
    risk_flags: list[str] = Field(default_factory=list, alias="riskFlags")
    suggested_hr_interview_questions: list[str] = Field(
        default_factory=list, alias="suggestedHRInterviewQuestions"
    )
    recommended_next_steps: list[str] = Field(default_factory=list, alias="recommendedNextSteps")
    responsible_ai_note: str = Field(default="", alias="responsibleAINote")
    model_config = ConfigDict(populate_by_name=True)


class CandidateScorecardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    job_role_id: int
    overall_readiness_score: int
    strengths_json: list
    weaknesses_json: list
    skill_scores_json: list
    risk_flags_json: list
    suggested_hr_questions_json: list
    recommended_next_step: str
    ai_summary: str
    responsible_ai_note: str
    created_at: datetime


# -------------- Onboarding --------------
class GeneratedOnboardingQuiz(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str = Field(default="", alias="correctAnswer")
    explanation: str = ""
    model_config = ConfigDict(populate_by_name=True)


class GeneratedOnboardingModule(BaseModel):
    title: str
    type: OnboardingModuleType = "other"
    description: str = ""
    lesson: str = ""
    quiz: list[GeneratedOnboardingQuiz] = Field(default_factory=list)


class GeneratedOnboardingPlan(BaseModel):
    title: str
    modules: list[GeneratedOnboardingModule] = Field(default_factory=list)
    readiness_milestones: list[str] = Field(default_factory=list, alias="readinessMilestones")
    manager_checklist: list[str] = Field(default_factory=list, alias="managerChecklist")
    model_config = ConfigDict(populate_by_name=True)


class OnboardingPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    employee_id: int
    title: str
    source_candidate_id: int | None
    modules_json: list
    manager_checklist_json: list
    status: str
    readiness_score: int
    created_at: datetime


class OnboardingModuleStatusUpdate(BaseModel):
    module_index: int
    score: int = 0
    status: Literal["completed", "in_progress"] = "completed"


# -------------- HR dashboards --------------
class HiringPipelineStat(BaseModel):
    status: str
    count: int


class HiringDashboard(BaseModel):
    total_roles: int
    total_candidates: int
    pipeline: list[HiringPipelineStat]
    avg_readiness: float
    ready_for_hr_interview: int
    recent_ai_interviews: list[dict]
    needs_review: int


class OnboardingReadinessDashboard(BaseModel):
    total_onboardings: int
    avg_readiness: float
    weak_topics: list[dict]
    employees: list[dict]


# -------------- Generic --------------
class GenericMessage(BaseModel):
    message: str


# -------------- Candidate auth --------------
class CandidateTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    candidate: CandidateRead
