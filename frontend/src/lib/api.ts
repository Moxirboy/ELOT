import axios, { type AxiosInstance } from "axios";

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("elot_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("elot_token");
      localStorage.removeItem("elot_user");
    }
    return Promise.reject(err);
  },
);

export type Role =
  | "admin"
  | "learner"
  | "manager"
  | "supervisor"
  | "buddy"
  | "it";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  company_id: number;
  employee_id?: number | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function loginDemoAdmin(): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/demo-admin");
  return data;
}

export async function loginDemoLearner(): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/demo-learner");
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export interface RoleOptionEmployee {
  employee_id: number;
  name: string;
  department: string;
  instance_count: number;
}

export interface RoleOptionsResponse {
  managers: RoleOptionEmployee[];
  supervisors: RoleOptionEmployee[];
  buddies: RoleOptionEmployee[];
  it_owners: RoleOptionEmployee[];
}

export async function fetchRoleOptions(): Promise<RoleOptionsResponse> {
  const { data } = await api.get<RoleOptionsResponse>("/auth/role-options");
  return data;
}

export async function loginDemoRole(
  role: "manager" | "supervisor" | "buddy" | "it",
  employee_id: number,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/demo-role", {
    role,
    employee_id,
  });
  return data;
}

// ---- Employees
export interface Employee {
  id: number;
  company_id: number;
  name: string;
  email: string;
  department: string;
  job_role: string;
  risk_level: "low" | "medium" | "high";
  created_at: string;
}
export const Employees = {
  list: () => api.get<Employee[]>("/employees").then((r) => r.data),
  create: (body: Partial<Employee>) =>
    api.post<Employee>("/employees", body).then((r) => r.data),
  update: (id: number, body: Partial<Employee>) =>
    api.patch<Employee>(`/employees/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/employees/${id}`).then((r) => r.data),
};

// ---- Policies
export interface Policy {
  id: number;
  company_id: number;
  title: string;
  content: string;
  language: string;
  created_at: string;
}
export const Policies = {
  list: () => api.get<Policy[]>("/policies").then((r) => r.data),
  create: (body: Partial<Policy>) =>
    api.post<Policy>("/policies", body).then((r) => r.data),
};

// ---- Courses
export interface Course {
  id: number;
  company_id: number;
  policy_id: number | null;
  title: string;
  description: string;
  estimated_minutes: number;
  difficulty: string;
  language: string;
  generated_json: GeneratedCourseJSON | null;
  created_at: string;
}

export interface LessonItem {
  id: number;
  title: string;
  content: string;
  key_takeaway: string;
  order_index: number;
}
export interface ScenarioItem {
  id: number;
  title: string;
  situation: string;
  question: string;
  ideal_answer: string;
  risk_level: "low" | "medium" | "high";
  policy_reference: string;
}
export interface QuizItem {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}
export interface CourseDetail extends Course {
  lessons: LessonItem[];
  scenarios: ScenarioItem[];
  quiz: QuizItem[];
}

export interface GeneratedCourseJSON {
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: string;
  learningObjectives: string[];
  lessons: {
    title: string;
    content: string;
    keyTakeaway: string;
    roleBasedExamples?: Record<string, string>;
  }[];
  scenarios: {
    title: string;
    situation: string;
    question: string;
    idealAnswer: string;
    riskLevel: "low" | "medium" | "high";
    policyReference: string;
  }[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    topic: string;
  }[];
  certificateTitle: string;
  limitations: string[];
}

export const Courses = {
  list: () => api.get<Course[]>("/courses").then((r) => r.data),
  detail: (id: number) =>
    api.get<CourseDetail>(`/courses/${id}`).then((r) => r.data),
  create: (body: {
    title: string;
    description?: string;
    estimated_minutes?: number;
    difficulty?: string;
    language?: string;
    generated_json?: GeneratedCourseJSON;
    policy_id?: number | null;
  }) => api.post<Course>("/courses", body).then((r) => r.data),
  remove: (id: number) => api.delete(`/courses/${id}`).then((r) => r.data),
};

// ---- AI
export const AI = {
  generateCourse: (body: {
    policy_title: string;
    policy_text: string;
    language?: string;
    audience?: string;
  }) =>
    api
      .post<{ course: GeneratedCourseJSON }>("/ai/generate-course", body)
      .then((r) => r.data.course),
  evaluateScenario: (body: {
    course_id: number;
    scenario_id: number;
    employee_id: number;
    user_answer: string;
  }) =>
    api
      .post<{
        isCorrect: boolean;
        score: number;
        riskLevel: "low" | "medium" | "high";
        feedback: string;
        betterAnswer: string;
        policyReference: string;
        coachingTip: string;
      }>("/ai/evaluate-scenario", body)
      .then((r) => r.data),
  copilot: (question: string) =>
    api
      .post<{
        answer: string;
        evidence: string[];
        recommended_actions: string[];
        draft_message: string;
      }>("/ai/admin-copilot", { question })
      .then((r) => r.data),
};

// ---- Assignments
export interface Assignment {
  id: number;
  company_id: number;
  employee_id: number;
  course_id: number;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  score: number;
  risk_level: "low" | "medium" | "high";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export const Assignments = {
  list: () => api.get<Assignment[]>("/assignments").then((r) => r.data),
  create: (body: {
    course_id: number;
    employee_ids?: number[];
    department?: string | null;
    due_date?: string | null;
  }) => api.post<Assignment[]>("/assignments", body).then((r) => r.data),
  start: (id: number) =>
    api.patch<Assignment>(`/assignments/${id}/start`).then((r) => r.data),
  complete: (id: number, body: { score?: number; risk_level?: string }) =>
    api
      .patch<Assignment>(`/assignments/${id}/complete`, body)
      .then((r) => r.data),
};

// ---- Learner
export interface LearnerCourseListItem {
  assignment_id: number;
  course_id: number;
  title: string;
  description: string;
  estimated_minutes: number;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  score: number;
  risk_level: string;
  due_date: string | null;
  completed_at: string | null;
}
export interface LearnerDashboardData {
  employee_id: number;
  employee_name: string;
  department: string;
  completed: number;
  in_progress: number;
  not_started: number;
  overdue: number;
  courses: LearnerCourseListItem[];
  certificates: CertificateData[];
}
export const Learner = {
  dashboard: () =>
    api.get<LearnerDashboardData>("/learner/dashboard").then((r) => r.data),
  course: (id: number) =>
    api.get<CourseDetail>(`/learner/courses/${id}`).then((r) => r.data),
};

// ---- Admin dashboard
export interface DepartmentStat {
  department: string;
  completion_rate: number;
  average_score: number;
  high_risk: number;
}
export interface WeakTopic {
  topic: string;
  average_score: number;
  attempts: number;
}
export interface RecentCompletion {
  employee_name: string;
  course_title: string;
  completed_at: string;
  score: number;
}
export interface AdminDashboardData {
  total_employees: number;
  total_courses: number;
  completion_rate: number;
  average_score: number;
  high_risk_count: number;
  overdue_count: number;
  weakest_topics: WeakTopic[];
  department_stats: DepartmentStat[];
  recent_completions: RecentCompletion[];
}
export const Dashboard = {
  admin: () =>
    api.get<AdminDashboardData>("/dashboard/admin").then((r) => r.data),
};

// ---- Certificates
export interface CertificateData {
  id: number;
  employee_id: number;
  course_id: number;
  certificate_id: string;
  issued_at: string;
  employee_name?: string | null;
  course_title?: string | null;
  score?: number | null;
}
export const Certificates = {
  get: (certificate_id: string) =>
    api
      .get<CertificateData>(`/certificates/${certificate_id}`)
      .then((r) => r.data),
  issue: (employee_id: number, course_id: number) =>
    api
      .post<CertificateData>("/certificates", { employee_id, course_id })
      .then((r) => r.data),
};

// ---- Threats & security ---------------------------------------------------

export interface ThreatSource {
  id: number;
  name: string;
  source_type: string;
  url: string;
  enabled: boolean;
  last_checked_at: string | null;
  created_at: string;
}

export interface ThreatReport {
  id: number;
  source_id: number;
  title: string;
  summary: string;
  published_at: string | null;
  source_url: string;
  confidence_score: number;
  created_at: string;
}

export interface ThreatTrend {
  id: number;
  report_id: number | null;
  title: string;
  method: string;
  channel: string;
  target_roles_json: string[];
  red_flags_json: string[];
  safe_response_json: string[];
  risk_level: "low" | "medium" | "high";
  ai_summary_json: {
    title?: string;
    method?: string;
    channel?: string;
    target_users?: string[];
    red_flags?: string[];
    safe_response?: string[];
    training_recommendation?: string;
  } | null;
  created_at: string;
}

export interface GeneratedTrainingScenario {
  message: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GeneratedTrainingQuiz {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GeneratedTrainingLesson {
  lesson: string;
  summary: string;
  redFlags: string[];
  safeActions: string[];
  adminNotes: string;
  limitations: string[];
}

export interface GeneratedTraining {
  id: number;
  company_id: number;
  trend_id: number;
  title: string;
  lesson_json: GeneratedTrainingLesson | null;
  quiz_json: GeneratedTrainingQuiz[];
  scenario_json: GeneratedTrainingScenario | null;
  status: "draft" | "approved" | "published";
  approved_by_user_id: number | null;
  approved_at: string | null;
  created_at: string;
}

export interface PhishingTest {
  id: number;
  company_id: number;
  training_id: number | null;
  title: string;
  test_type: "in_app" | "email_simulation";
  scenario_json: GeneratedTrainingScenario | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export interface PhishingTestResult {
  id: number;
  test_id: number;
  employee_id: number;
  action:
    | "opened"
    | "clicked"
    | "reported"
    | "answered_correctly"
    | "answered_risky";
  answer: string;
  score: number;
  risk_level: "low" | "medium" | "high";
  feedback_json: {
    isCorrect?: boolean;
    correctAnswer?: string;
    explanation?: string;
    elapsed_ms?: number | null;
  } | null;
  created_at: string;
  employee_name?: string | null;
}

export interface SecurityDeptStat {
  department: string;
  correct: number;
  risky: number;
  average_score: number;
  high_risk_employees: number;
}

export interface SecurityEmployeeRisk {
  employee_id: number;
  name: string;
  department: string;
  risk_level: "low" | "medium" | "high";
  risky_actions: number;
  correct_actions: number;
  average_score: number;
}

export interface SecurityAwarenessDashboard {
  active_trends: number;
  drafts: number;
  published_trainings: number;
  tests_run: number;
  correct_rate: number;
  average_response_score: number;
  department_stats: SecurityDeptStat[];
  riskiest_employees: SecurityEmployeeRisk[];
  weak_methods: { method: string; risky: number; correct: number }[];
}

export const Threats = {
  sources: () =>
    api.get<ThreatSource[]>("/threats/sources").then((r) => r.data),
  sync: () =>
    api
      .post<{
        fetched_reports: number;
        new_trends: number;
        sources_used: string[];
        used_sample_fallback: boolean;
      }>("/threats/sync")
      .then((r) => r.data),
  reports: () =>
    api.get<ThreatReport[]>("/threats/reports").then((r) => r.data),
  trends: () =>
    api.get<ThreatTrend[]>("/threats/trends").then((r) => r.data),
  trend: (id: number) =>
    api.get<ThreatTrend>(`/threats/trends/${id}`).then((r) => r.data),
  generateTraining: (trendId: number) =>
    api
      .post<GeneratedTraining>(`/threats/trends/${trendId}/generate-training`)
      .then((r) => r.data),
  trainings: () =>
    api.get<GeneratedTraining[]>("/threats/trainings").then((r) => r.data),
  training: (id: number) =>
    api
      .get<GeneratedTraining>(`/threats/trainings/${id}`)
      .then((r) => r.data),
  approve: (id: number) =>
    api
      .post<GeneratedTraining>(`/threats/trainings/${id}/approve`)
      .then((r) => r.data),
  publish: (id: number) =>
    api
      .post<GeneratedTraining>(`/threats/trainings/${id}/publish`)
      .then((r) => r.data),
  removeTraining: (id: number) =>
    api.delete(`/threats/trainings/${id}`).then((r) => r.data),
};

export const PhishingTests = {
  list: () =>
    api.get<PhishingTest[]>("/phishing-tests").then((r) => r.data),
  get: (id: number) =>
    api.get<PhishingTest>(`/phishing-tests/${id}`).then((r) => r.data),
  create: (body: {
    title: string;
    training_id?: number | null;
    test_type?: "in_app" | "email_simulation";
    scenario_json?: GeneratedTrainingScenario | null;
    scheduled_at?: string | null;
  }) => api.post<PhishingTest>("/phishing-tests", body).then((r) => r.data),
  results: (testId: number) =>
    api
      .get<PhishingTestResult[]>(`/phishing-tests/${testId}/results`)
      .then((r) => r.data),
  submitAnswer: (
    testId: number,
    body: {
      employee_id: number;
      answer: string;
      elapsed_ms?: number;
      action?:
        | "opened"
        | "clicked"
        | "reported"
        | "answered_correctly"
        | "answered_risky";
    },
  ) =>
    api
      .post<PhishingTestResult>(`/phishing-tests/${testId}/submit-answer`, body)
      .then((r) => r.data),
};

export const SecurityDashboard = {
  awareness: () =>
    api
      .get<SecurityAwarenessDashboard>("/dashboard/security-awareness")
      .then((r) => r.data),
};

// ---- Hiring / onboarding ---------------------------------------------------

export type CandidateStatus =
  | "applied"
  | "training_assigned"
  | "training_completed"
  | "ai_interview_completed"
  | "hr_review"
  | "hr_interview"
  | "hired"
  | "rejected";

export interface RoleProfile {
  title: string;
  department: string;
  seniority: string;
  summary: string;
  idealCandidate: string;
  successOutcomes: string[];
}

export interface RequiredSkill {
  name: string;
  category:
    | "technical"
    | "communication"
    | "policy"
    | "culture"
    | "security"
    | "domain";
  importance: "low" | "medium" | "high";
  description: string;
}

export interface TrainingMapItem {
  title: string;
  description: string;
  content: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface InterviewPlanItem {
  question: string;
  skillTested: string;
  goodAnswerSignals: string[];
  redFlags: string[];
  scoreWeight: number;
}

export interface AssessmentPlanItem {
  taskTitle: string;
  taskDescription: string;
  evaluationCriteria: string[];
}

export interface RubricCategory {
  name: string;
  weight: number;
  description: string;
}

export interface GeneratedRolePlan {
  roleProfile: RoleProfile;
  requiredSkills: RequiredSkill[];
  trainingMap: TrainingMapItem[];
  interviewPlan: InterviewPlanItem[];
  assessmentPlan: AssessmentPlanItem[];
  rubric: { categories: RubricCategory[]; passingScore: number };
  onboardingPlan: { title: string; description: string; type: string }[];
  responsibleAINotes: string[];
}

export interface JobRole {
  id: number;
  company_id: number;
  title: string;
  description: string;
  department: string;
  seniority: string;
  required_skills_json: RequiredSkill[];
  training_map_json: TrainingMapItem[];
  interview_plan_json: InterviewPlanItem[];
  assessment_plan_json: AssessmentPlanItem[];
  rubric_json: { categories: RubricCategory[]; passingScore: number } | null;
  onboarding_plan_json: { title: string; description: string; type: string }[];
  role_profile_json: RoleProfile | null;
  responsible_ai_notes_json: string[];
  created_at: string;
  updated_at: string | null;
}

export interface Candidate {
  id: number;
  company_id: number;
  job_role_id: number;
  full_name: string;
  email: string;
  status: CandidateStatus;
  training_progress: number;
  ai_interview_score: number;
  assessment_score: number;
  readiness_score: number;
  recommendation:
    | "invite_to_hr_interview"
    | "needs_more_review"
    | "not_ready"
    | "";
  notes: string;
  hired_employee_id: number | null;
  created_at: string;
  updated_at: string | null;
  role_title?: string | null;
}

export interface CandidateModule {
  id: number;
  candidate_id: number;
  job_role_id: number;
  title: string;
  description: string;
  content: string;
  quiz_json: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  order_index: number;
  status: "not_started" | "in_progress" | "completed";
  score: number;
  completed_at: string | null;
}

export interface CandidateDashboardData {
  candidate: Candidate;
  role: JobRole;
  modules: CandidateModule[];
  ai_interview_status: "not_started" | "in_progress" | "completed";
  ai_interview_question_count: number;
  next_action: string;
}

export interface InterviewQuestion {
  interview_id: number;
  question_number: number;
  total_questions: number;
  question: string;
  skill_tested: string;
  why_this_matters: string;
}

export interface InterviewFeedback {
  score: number;
  skillScores: { skill: string; score: number; reason?: string }[];
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  betterAnswerExample: string;
  hrReviewNote: string;
}

export interface InterviewSubmitResponse {
  feedback: InterviewFeedback;
  next_question: InterviewQuestion | null;
  is_complete: boolean;
}

export interface InterviewSummary {
  id: number;
  candidate_id: number;
  job_role_id: number;
  transcript_json: {
    role: "interviewer" | "candidate" | "feedback";
    text: string;
    skill_tested?: string;
    score?: number;
  }[];
  score_json: {
    question: string;
    skill_tested: string;
    score: number;
    skill_scores: { skill: string; score: number; reason?: string }[];
    strengths: string[];
    weaknesses: string[];
    red_flags: string[];
    better_answer_example: string;
  }[];
  overall_score: number;
  recommendation: string;
  status: string;
  finished_at: string | null;
  created_at: string;
}

export interface CandidateScorecard {
  id: number;
  candidate_id: number;
  job_role_id: number;
  overall_readiness_score: number;
  strengths_json: string[];
  weaknesses_json: string[];
  skill_scores_json: { skill: string; score: number }[];
  risk_flags_json: string[];
  suggested_hr_questions_json: string[];
  recommended_next_step: string;
  ai_summary: string;
  responsible_ai_note: string;
  created_at: string;
}

export interface HiringDashboardData {
  total_roles: number;
  total_candidates: number;
  pipeline: { status: string; count: number }[];
  avg_readiness: number;
  ready_for_hr_interview: number;
  recent_ai_interviews: {
    interview_id: number;
    candidate_id: number;
    candidate_name: string;
    overall_score: number;
    recommendation: string;
    created_at: string;
  }[];
  needs_review: number;
}

export interface OnboardingModuleState {
  title: string;
  type: string;
  description: string;
  lesson: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  status: "not_started" | "in_progress" | "completed";
  score: number;
  completed_at: string | null;
}

export interface OnboardingPlanData {
  id: number;
  company_id: number;
  employee_id: number;
  title: string;
  source_candidate_id: number | null;
  modules_json: OnboardingModuleState[];
  manager_checklist_json: string[];
  status: string;
  readiness_score: number;
  created_at: string;
}

export interface OnboardingReadinessData {
  total_onboardings: number;
  avg_readiness: number;
  weak_topics: { topic: string; average_score: number; incidents: number }[];
  employees: {
    employee_id: number;
    name: string;
    department: string;
    title: string;
    readiness_score: number;
    modules_total: number;
    modules_completed: number;
    average_score: number;
  }[];
}

export const Hiring = {
  dashboard: () =>
    api.get<HiringDashboardData>("/dashboard/hiring").then((r) => r.data),
  onboardingReadiness: () =>
    api
      .get<OnboardingReadinessData>("/dashboard/onboarding-readiness")
      .then((r) => r.data),
  // Roles
  listRoles: () => api.get<JobRole[]>("/job-roles").then((r) => r.data),
  getRole: (id: number) => api.get<JobRole>(`/job-roles/${id}`).then((r) => r.data),
  createRole: (body: Partial<JobRole>) =>
    api.post<JobRole>("/job-roles", body).then((r) => r.data),
  deleteRole: (id: number) => api.delete(`/job-roles/${id}`).then((r) => r.data),
  generateRolePlan: (body: {
    title: string;
    department: string;
    seniority: string;
    role_description: string;
    company_notes?: string;
  }) =>
    api
      .post<GeneratedRolePlan>("/ai/generate-role-plan", body)
      .then((r) => r.data),
  // Candidates
  listCandidates: (opts: { role_id?: number; status?: CandidateStatus } = {}) => {
    const params = new URLSearchParams();
    if (opts.role_id) params.set("role_id", String(opts.role_id));
    if (opts.status) params.set("status_filter", opts.status);
    const q = params.toString();
    return api
      .get<Candidate[]>(`/candidates${q ? `?${q}` : ""}`)
      .then((r) => r.data);
  },
  getCandidate: (id: number) =>
    api.get<Candidate>(`/candidates/${id}`).then((r) => r.data),
  createCandidate: (body: {
    job_role_id: number;
    full_name: string;
    email: string;
    notes?: string;
  }) => api.post<Candidate>("/candidates", body).then((r) => r.data),
  assignTraining: (id: number) =>
    api.post<Candidate>(`/candidates/${id}/assign-training`).then((r) => r.data),
  markHired: (id: number) =>
    api.post<Candidate>(`/candidates/${id}/mark-hired`).then((r) => r.data),
  reject: (id: number) =>
    api.post<Candidate>(`/candidates/${id}/reject`).then((r) => r.data),
  generateScorecard: (id: number) =>
    api
      .post<CandidateScorecard>(`/candidates/${id}/generate-scorecard`)
      .then((r) => r.data),
  getScorecard: (id: number) =>
    api.get<CandidateScorecard>(`/candidates/${id}/scorecard`).then((r) => r.data),
  getAdminInterview: (id: number) =>
    api
      .get<InterviewSummary>(`/candidates/${id}/ai-interview`)
      .then((r) => r.data),
  convertToEmployee: (id: number) =>
    api
      .post<OnboardingPlanData>(`/candidates/${id}/convert-to-employee`)
      .then((r) => r.data),
};

export const CandidatePortal = {
  loginByEmail: (email: string) =>
    api
      .post<{
        access_token: string;
        token_type: string;
        candidate: Candidate;
      }>(`/auth/demo-candidate?email=${encodeURIComponent(email)}`)
      .then((r) => r.data),
  loginById: (id: number) =>
    api
      .post<{
        access_token: string;
        token_type: string;
        candidate: Candidate;
      }>(`/auth/demo-candidate?candidate_id=${id}`)
      .then((r) => r.data),
  dashboard: () =>
    api.get<CandidateDashboardData>("/candidate/dashboard").then((r) => r.data),
  listModules: () =>
    api.get<CandidateModule[]>("/candidate/modules").then((r) => r.data),
  getModule: (id: number) =>
    api.get<CandidateModule>(`/candidate/modules/${id}`).then((r) => r.data),
  submitQuiz: (id: number, answers: string[]) =>
    api
      .post<{
        score: number;
        correct: number;
        total: number;
        feedback: {
          question: string;
          your_answer: string;
          correct_answer: string;
          is_correct: boolean;
          explanation: string;
        }[];
      }>(`/candidate/modules/${id}/quiz`, { answers })
      .then((r) => r.data),
  completeModule: (id: number) =>
    api
      .post<CandidateModule>(`/candidate/modules/${id}/complete`)
      .then((r) => r.data),
  startInterview: (candidateId: number) =>
    api
      .post<InterviewQuestion>(`/candidates/${candidateId}/start-ai-interview`)
      .then((r) => r.data),
  submitInterviewAnswer: (candidateId: number, answer: string) =>
    api
      .post<InterviewSubmitResponse>(
        `/candidates/${candidateId}/submit-ai-interview-answer`,
        { answer },
      )
      .then((r) => r.data),
  finishInterview: (candidateId: number) =>
    api
      .post<InterviewSummary>(
        `/candidates/${candidateId}/finish-ai-interview`,
      )
      .then((r) => r.data),
};

export const Onboarding = {
  forEmployee: (employeeId: number) =>
    api
      .get<OnboardingPlanData>(`/onboarding/employee/${employeeId}`)
      .then((r) => r.data),
  mine: () =>
    api.get<OnboardingPlanData | null>("/onboarding/mine").then((r) => r.data),
  updateModule: (
    employeeId: number,
    body: { module_index: number; score?: number; status?: "completed" | "in_progress" },
  ) =>
    api
      .patch<OnboardingPlanData>(`/onboarding/employee/${employeeId}/module`, body)
      .then((r) => r.data),
};

// ===========================================================================
// Onboarding OS — multi-role full onboarding workflow
// ===========================================================================

export type OnbStage =
  | "preboarding" | "day_1" | "week_1" | "day_30" | "day_60" | "day_90" | "extended";
export type OnbCategory =
  | "compliance" | "role_training" | "culture" | "tools" | "practical"
  | "ai_simulation" | "manager_review" | "supervisor_review" | "buddy_checkin"
  | "employee_feedback" | "it_setup" | "final_evaluation";
export type OnbStatus =
  | "not_started" | "in_progress" | "submitted" | "needs_review"
  | "needs_improvement" | "approved" | "failed" | "overdue" | "blocked" | "completed";
export type OnbPriority = "low" | "medium" | "high" | "critical";
export type OnbDecision = "approved" | "needs_improvement" | "failed";
export type OnbRole = "hr" | "manager" | "supervisor" | "buddy" | "employee" | "it" | "super_admin";

export interface OnbTemplateTaskShape {
  id: number;
  template_id: number;
  title: string;
  description: string;
  stage: OnbStage;
  category: OnbCategory;
  default_due_day: number;
  default_owner_role: OnbRole;
  default_reviewer_role: OnbRole;
  approval_required: boolean;
  feedback_required: boolean;
  required_score: number | null;
  priority: OnbPriority;
  resources: { name?: string; url?: string }[];
  quiz: { question: string; options: string[]; correctAnswer: string; explanation: string }[] | null;
  order_index: number;
}

export interface OnbTemplate {
  id: number;
  company_id: number;
  name: string;
  role_name: string;
  department: string;
  duration_days: number;
  description: string;
  success_criteria: string;
  required_score: number;
  final_approval_required: boolean;
  is_active: boolean;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnbTemplateDetail extends OnbTemplate {
  tasks: OnbTemplateTaskShape[];
}

export interface OnbInstanceCard {
  id: number;
  company_id: number;
  employee_id: number;
  template_id: number | null;
  role_name: string;
  department: string;
  start_date: string;
  end_date: string | null;
  duration_days: number;
  manager_id: number | null;
  supervisor_id: number | null;
  buddy_id: number | null;
  it_owner_id: number | null;
  status: string;
  overall_progress: number;
  readiness_score: number;
  risk_level: "low" | "medium" | "high";
  final_decision: string | null;
  success_criteria: string;
  created_at: string;
  updated_at: string;
  employee_name: string | null;
  manager_name: string | null;
  supervisor_name: string | null;
  buddy_name: string | null;
  open_tasks: number;
  overdue_tasks: number;
  pending_reviews: number;
  current_stage: OnbStage;
}

export interface OnbTaskShape {
  id: number;
  instance_id: number;
  title: string;
  description: string;
  stage: OnbStage;
  category: OnbCategory;
  assigned_by_user_id: number | null;
  assigned_by_role: string;
  assigned_to_employee_id: number;
  reviewer_employee_id: number | null;
  reviewer_role: string;
  due_date: string | null;
  status: OnbStatus;
  priority: OnbPriority;
  approval_required: boolean;
  feedback_required: boolean;
  required_score: number | null;
  score: number | null;
  resources_json: { name?: string; url?: string }[];
  quiz_json: { question: string; options: string[]; correctAnswer: string; explanation: string }[] | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_by_name: string | null;
  assigned_to_name: string | null;
  reviewer_name: string | null;
}

export interface OnbHRDashboard {
  total_active: number;
  completed: number;
  average_progress: number;
  average_readiness: number;
  overdue_tasks: number;
  pending_approvals: number;
  compliance_completion_rate: number;
  high_risk_count: number;
  manager_reviews_pending: number;
  supervisor_reviews_pending: number;
  employee_satisfaction: number;
  instances: OnbInstanceCard[];
}

export interface OnbManagerDashboard {
  manager_id: number;
  manager_name: string;
  new_hires: OnbInstanceCard[];
  pending_reviews: number;
  overdue_tasks: number;
  high_risk_count: number;
}

export interface OnbSupervisorDashboard {
  supervisor_id: number;
  supervisor_name: string;
  new_hires: OnbInstanceCard[];
  pending_review_tasks: OnbTaskShape[];
  overdue_tasks: number;
  avg_practical_score: number;
}

export interface OnbEmployeeTimeline {
  instance: OnbInstanceCard;
  employee_name: string;
  manager_name: string | null;
  supervisor_name: string | null;
  buddy_name: string | null;
  current_stage: OnbStage;
  stages: {
    stage: OnbStage;
    label: string;
    total: number;
    completed: number;
    tasks: OnbTaskShape[];
  }[];
  next_tasks: OnbTaskShape[];
  overdue_tasks: OnbTaskShape[];
  completed_count: number;
  total_count: number;
}

export interface OnbAIRecommendation {
  id: number;
  instance_id: number;
  task_id: number | null;
  risk_level: "low" | "medium" | "high";
  reason: string;
  recommended_action: string;
  recommended_training: string[];
  notify_roles: string[];
  created_at: string;
}

export interface OnbTaskFeedback {
  id: number;
  task_id: number;
  instance_id: number;
  from_user_id: number | null;
  from_role: string;
  to_employee_id: number;
  rating: number | null;
  score: number | null;
  strengths: string;
  weaknesses: string;
  comment: string;
  decision: OnbDecision;
  rubric_scores_json: Record<string, number> | null;
  visibility: string;
  created_at: string;
  from_name: string | null;
}

export interface OnbReview {
  id: number;
  instance_id: number;
  review_type: "30_day" | "60_day" | "90_day" | "final";
  reviewer_employee_id: number | null;
  reviewer_user_id: number | null;
  role_clarity_score: number;
  workflow_score: number;
  communication_score: number;
  ownership_score: number;
  productivity_score: number;
  culture_score: number;
  strengths: string;
  weaknesses: string;
  next_goals: string;
  decision: string;
  created_at: string;
  reviewer_name: string | null;
}

export interface OnbNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  target_url: string;
  created_at: string;
}

export interface OnbFinalReport {
  instance: OnbInstanceCard;
  employee_name: string;
  completed_tasks: number;
  incomplete_tasks: number;
  compliance_complete: boolean;
  quiz_average: number;
  practical_average: number;
  manager_reviews: OnbReview[];
  supervisor_feedback_count: number;
  buddy_checkins: { id: number; buddy_name: string | null; comment: string; culture_score: number; connection_score: number; created_at: string }[];
  employee_feedback: { id: number; confidence_score: number; clarity_score: number; support_score: number; comment: string; blockers: string; created_at: string }[];
  strengths: string[];
  weaknesses: string[];
  risk_history: OnbAIRecommendation[];
  ai_recommendation: string;
  final_decision: string;
  next_development_plan: string[];
}

export const OnboardingOS = {
  // Templates
  listTemplates: () => api.get<OnbTemplate[]>("/onboarding-os/templates").then((r) => r.data),
  getTemplate: (id: number) =>
    api.get<OnbTemplateDetail>(`/onboarding-os/templates/${id}`).then((r) => r.data),
  createTemplate: (body: Partial<OnbTemplate> & { tasks?: Partial<OnbTemplateTaskShape>[] }) =>
    api.post<OnbTemplate>("/onboarding-os/templates", body).then((r) => r.data),
  generateTemplate: (body: {
    role_name: string;
    department?: string;
    duration_days?: number;
    description: string;
    company_context?: string;
    required_score?: number;
  }) =>
    api
      .post<OnbTemplateDetail>("/onboarding-os/templates/generate-ai", body)
      .then((r) => r.data),
  deleteTemplate: (id: number) =>
    api.delete(`/onboarding-os/templates/${id}`).then((r) => r.data),

  // Instances
  listInstances: () =>
    api.get<OnbInstanceCard[]>("/onboarding-os/instances").then((r) => r.data),
  getInstance: (id: number) =>
    api.get<OnbInstanceCard>(`/onboarding-os/instances/${id}`).then((r) => r.data),
  createInstance: (body: {
    employee_id: number;
    template_id?: number | null;
    role_name?: string;
    department?: string;
    duration_days?: number;
    start_date?: string | null;
    manager_id?: number | null;
    supervisor_id?: number | null;
    buddy_id?: number | null;
    it_owner_id?: number | null;
  }) =>
    api
      .post<OnbInstanceCard>("/onboarding-os/instances", body)
      .then((r) => r.data),
  assignChain: (
    instanceId: number,
    body: { manager_id?: number; supervisor_id?: number; buddy_id?: number; it_owner_id?: number },
  ) =>
    api
      .post<OnbInstanceCard>(`/onboarding-os/instances/${instanceId}/assign`, body)
      .then((r) => r.data),

  // Tasks
  listTasks: (instanceId: number) =>
    api
      .get<OnbTaskShape[]>(`/onboarding-os/instances/${instanceId}/tasks`)
      .then((r) => r.data),
  createTask: (
    instanceId: number,
    body: {
      title: string;
      description?: string;
      stage?: OnbStage;
      category?: OnbCategory;
      assigned_by_role?: OnbRole;
      assigned_to_employee_id: number;
      reviewer_employee_id?: number | null;
      reviewer_role?: OnbRole;
      due_date?: string | null;
      priority?: OnbPriority;
      approval_required?: boolean;
      feedback_required?: boolean;
      required_score?: number | null;
      resources?: { name?: string; url?: string }[];
    },
  ) =>
    api
      .post<OnbTaskShape>(`/onboarding-os/instances/${instanceId}/tasks`, body)
      .then((r) => r.data),
  getTask: (taskId: number) =>
    api.get<OnbTaskShape>(`/onboarding-os/tasks/${taskId}`).then((r) => r.data),
  submitTask: (
    taskId: number,
    body: {
      submission_text?: string;
      attachment_url?: string;
      quiz_answers?: Record<string, string>;
    },
  ) =>
    api
      .post(`/onboarding-os/tasks/${taskId}/submit`, body)
      .then((r) => r.data),
  reviewTask: (
    taskId: number,
    body: {
      decision: OnbDecision;
      rating?: number;
      score?: number;
      strengths?: string;
      weaknesses?: string;
      comment?: string;
      rubric_scores?: Record<string, number>;
      from_role?: OnbRole;
    },
  ) =>
    api
      .post<OnbTaskFeedback>(`/onboarding-os/tasks/${taskId}/review`, body)
      .then((r) => r.data),
  taskFeedback: (taskId: number) =>
    api
      .get<OnbTaskFeedback[]>(`/onboarding-os/tasks/${taskId}/feedback`)
      .then((r) => r.data),

  // Reviews
  createReview: (
    instanceId: number,
    body: {
      review_type: "30_day" | "60_day" | "90_day" | "final";
      role_clarity_score?: number;
      workflow_score?: number;
      communication_score?: number;
      ownership_score?: number;
      productivity_score?: number;
      culture_score?: number;
      strengths?: string;
      weaknesses?: string;
      next_goals?: string;
      decision?: string;
    },
  ) =>
    api
      .post<OnbReview>(`/onboarding-os/instances/${instanceId}/reviews`, body)
      .then((r) => r.data),
  listReviews: (instanceId: number) =>
    api
      .get<OnbReview[]>(`/onboarding-os/instances/${instanceId}/reviews`)
      .then((r) => r.data),

  // AI
  analyzeRisk: (instanceId: number) =>
    api
      .post<OnbAIRecommendation>(`/onboarding-os/instances/${instanceId}/analyze-risk`)
      .then((r) => r.data),
  askMentor: (instanceId: number, question: string) =>
    api
      .post<{ answer: string; sources: string[]; confidence: "low" | "medium" | "high" }>(
        `/onboarding-os/instances/${instanceId}/mentor`,
        { question },
      )
      .then((r) => r.data),
  recommendations: (instanceId: number) =>
    api
      .get<OnbAIRecommendation[]>(
        `/onboarding-os/instances/${instanceId}/ai-recommendations`,
      )
      .then((r) => r.data),

  // Dashboards
  hrDashboard: () =>
    api.get<OnbHRDashboard>("/onboarding-os/dashboard/hr").then((r) => r.data),
  managerDashboard: (employeeId: number) =>
    api
      .get<OnbManagerDashboard>(`/onboarding-os/dashboard/manager/${employeeId}`)
      .then((r) => r.data),
  supervisorDashboard: (employeeId: number) =>
    api
      .get<OnbSupervisorDashboard>(
        `/onboarding-os/dashboard/supervisor/${employeeId}`,
      )
      .then((r) => r.data),
  buddyDashboard: (employeeId: number) =>
    api
      .get<{
        buddy_id: number;
        buddy_name: string;
        new_hires: OnbInstanceCard[];
        recent_checkins: {
          id: number;
          instance_id: number;
          buddy_employee_id: number;
          employee_id: number;
          culture_score: number;
          connection_score: number;
          comment: string;
          created_at: string;
          buddy_name: string | null;
        }[];
        last_checkin_by_instance: Record<string, string | null>;
        open_help_requests: number;
        at_risk_hires: number;
      }>(`/onboarding-os/dashboard/buddy/${employeeId}`)
      .then((r) => r.data),
  itDashboard: (employeeId: number) =>
    api
      .get<{
        it_id: number;
        it_name: string;
        new_hires: OnbInstanceCard[];
        pending_setup_tasks: OnbTaskShape[];
        completed_setup_tasks: number;
        overdue_tasks: number;
        blocked_tasks: number;
        due_today: number;
        completed_this_week: number;
      }>(`/onboarding-os/dashboard/it/${employeeId}`)
      .then((r) => r.data),
  addBuddyCheckin: (
    instanceId: number,
    body: { culture_score: number; connection_score: number; comment: string },
  ) =>
    api
      .post(`/onboarding-os/instances/${instanceId}/buddy-checkin`, body)
      .then((r) => r.data),
  employeeTimeline: (employeeId: number) =>
    api
      .get<OnbEmployeeTimeline>(`/onboarding-os/employee/${employeeId}/timeline`)
      .then((r) => r.data),

  // Report
  finalReport: (instanceId: number) =>
    api
      .post<OnbFinalReport>(
        `/onboarding-os/instances/${instanceId}/generate-report`,
      )
      .then((r) => r.data),

  // Notifications
  notifications: (unreadOnly = false) =>
    api
      .get<OnbNotification[]>("/onboarding-os/notifications", {
        params: { unread_only: unreadOnly },
      })
      .then((r) => r.data),
  markRead: (id: number) =>
    api.post(`/onboarding-os/notifications/${id}/read`).then((r) => r.data),

  // Help requests
  createHelpRequest: (
    instanceId: number,
    body: {
      target_role: "buddy" | "hr" | "manager" | "it" | "supervisor";
      message: string;
      task_id?: number | null;
      priority?: "low" | "medium" | "high" | "critical";
    },
  ) =>
    api
      .post<OnbHelpRequest>(
        `/onboarding-os/instances/${instanceId}/help-requests`,
        body,
      )
      .then((r) => r.data),
  listHelpRequests: (params: {
    target_role?: "buddy" | "hr" | "manager" | "it" | "supervisor";
    status?: "open" | "responded" | "closed";
    instance_id?: number;
  } = {}) =>
    api
      .get<OnbHelpRequest[]>("/onboarding-os/help-requests", { params })
      .then((r) => r.data),
  respondHelpRequest: (
    id: number,
    body: { response_text: string; close?: boolean },
  ) =>
    api
      .post<OnbHelpRequest>(
        `/onboarding-os/help-requests/${id}/respond`,
        body,
      )
      .then((r) => r.data),

  // IT actions
  itTasks: (params: { status?: string; employee_id?: number } = {}) =>
    api
      .get<OnbTaskShape[]>("/onboarding-os/it/tasks", { params })
      .then((r) => r.data),
  itTasksPending: () =>
    api
      .get<OnbTaskShape[]>("/onboarding-os/it/tasks/pending")
      .then((r) => r.data),
  itTasksOverdue: () =>
    api
      .get<OnbTaskShape[]>("/onboarding-os/it/tasks/overdue")
      .then((r) => r.data),
  itTasksBlocked: () =>
    api
      .get<OnbTaskShape[]>("/onboarding-os/it/tasks/blocked")
      .then((r) => r.data),
  itCompleteTask: (
    taskId: number,
    body: { note?: string; asset_id?: string; score?: number } = {},
  ) =>
    api
      .post<OnbTaskShape>(`/onboarding-os/it/tasks/${taskId}/complete`, body)
      .then((r) => r.data),
  itBlockTask: (taskId: number, body: { reason: string; note?: string }) =>
    api
      .post<OnbTaskShape>(`/onboarding-os/it/tasks/${taskId}/block`, body)
      .then((r) => r.data),
  itUpdateTaskStatus: (
    taskId: number,
    body: {
      status: "not_started" | "in_progress" | "blocked" | "completed" | "overdue";
      note?: string;
      block_reason?: string;
      asset_id?: string;
    },
  ) =>
    api
      .put<OnbTaskShape>(`/onboarding-os/it/tasks/${taskId}/status`, body)
      .then((r) => r.data),
  itEmployeeSetup: (employeeId: number) =>
    api
      .get<{
        employee_id: number;
        employee_name: string;
        instance_id: number | null;
        items: {
          task_id: number;
          title: string;
          status: string;
          due_date: string | null;
          blocker_reason: string | null;
          completed_at: string | null;
          asset_id: string | null;
          reviewer_name: string | null;
        }[];
        completion_rate: number;
      }>(`/onboarding-os/it/employees/${employeeId}/setup`)
      .then((r) => r.data),
};

export interface OnbHelpRequest {
  id: number;
  instance_id: number;
  employee_id: number;
  target_role: "buddy" | "hr" | "manager" | "it" | "supervisor";
  message: string;
  task_id: number | null;
  status: "open" | "responded" | "closed";
  response_text: string;
  responded_by_employee_id: number | null;
  responded_at: string | null;
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  employee_name: string | null;
  responder_name: string | null;
}
