import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { CandidateLayout } from "@/components/layout/CandidateLayout";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { BuddyLayout } from "@/components/layout/BuddyLayout";
import { ITLayout } from "@/components/layout/ITLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireCandidate } from "@/components/RequireCandidate";

// Marketing + auth
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Unauthorized } from "@/pages/Unauthorized";

// Admin / HR
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { Employees } from "@/pages/admin/Employees";
import { CourseLibrary } from "@/pages/admin/CourseLibrary";
import { CourseBuilder } from "@/pages/admin/CourseBuilder";
import { CourseDetail as AdminCourseDetail } from "@/pages/admin/CourseDetail";
import { AssignmentPage } from "@/pages/admin/AssignmentPage";
import { Copilot } from "@/pages/admin/Copilot";
import { ThreatIntelligence } from "@/pages/admin/ThreatIntelligence";
import { ThreatTrendDetail } from "@/pages/admin/ThreatTrendDetail";
import { PhishingTestsPage } from "@/pages/admin/PhishingTests";
import { SecurityDashboardPage } from "@/pages/admin/SecurityDashboard";
import { HiringDashboard } from "@/pages/admin/HiringDashboard";
import { HiringRolesList } from "@/pages/admin/HiringRoles";
import { RoleBuilder } from "@/pages/admin/RoleBuilder";
import { RoleDetail } from "@/pages/admin/RoleDetail";
import { CandidatesList } from "@/pages/admin/CandidatesList";
import { CandidateDetail } from "@/pages/admin/CandidateDetail";
import { OnboardingDashboard as AdminOnboardingDashboard } from "@/pages/admin/OnboardingDashboard";
import { OnboardingPlanView } from "@/pages/admin/OnboardingPlanView";
import { HRDashboardOS } from "@/pages/admin/onboarding_os/HRDashboardOS";
import { TemplatesList } from "@/pages/admin/onboarding_os/TemplatesList";
import { TemplateDetail } from "@/pages/admin/onboarding_os/TemplateDetail";
import { InstanceCreate as OSInstanceCreate } from "@/pages/admin/onboarding_os/InstanceCreate";
import { InstanceDetail as OSInstanceDetail } from "@/pages/admin/onboarding_os/InstanceDetail";
import {
  ManagerDashboardPage,
  SupervisorDashboardPage,
} from "@/pages/admin/onboarding_os/ManagerSupervisorDashboard";

// Buddy
import { BuddyDashboard } from "@/pages/buddy/BuddyDashboard";
import { BuddyNewHires } from "@/pages/buddy/BuddyNewHires";
import { BuddyNewHireDetail } from "@/pages/buddy/BuddyNewHireDetail";
import { BuddyCheckIns } from "@/pages/buddy/BuddyCheckIns";
import { BuddyCheckInForm } from "@/pages/buddy/BuddyCheckInForm";
import { BuddyHelpRequests } from "@/pages/buddy/BuddyHelpRequests";

// IT
import { ITDashboard } from "@/pages/it/ITDashboard";
import {
  ITTasksAll,
  ITPendingTasks,
  ITOverdueTasks,
  ITBlockedTasks,
} from "@/pages/it/ITTaskList";
import { ITEmployeeSetup } from "@/pages/it/ITEmployeeSetup";
import { ITAssets } from "@/pages/it/ITAssets";

// Learner
import { LearnerDashboard } from "@/pages/learner/LearnerDashboard";
import { CoursePlayer } from "@/pages/learner/CoursePlayer";
import { CertificatePage } from "@/pages/learner/CertificatePage";
import { SecurityChallenge } from "@/pages/learner/SecurityChallenge";
import { LearnerOnboarding } from "@/pages/learner/OnboardingDashboard";
import { OnboardingModule } from "@/pages/learner/OnboardingModule";
import { OSTimeline } from "@/pages/learner/onboarding_os/OSTimeline";

// Candidate portal
import { CandidateLogin } from "@/pages/candidate/CandidateLogin";
import { CandidateDashboard } from "@/pages/candidate/CandidateDashboard";
import { CandidateTraining } from "@/pages/candidate/CandidateTraining";
import { AIInterview } from "@/pages/candidate/AIInterview";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin / HR */}
        <Route
          element={
            <ProtectedRoute roles="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<Employees />} />
          <Route path="/admin/courses" element={<CourseLibrary />} />
          <Route path="/admin/courses/:id" element={<AdminCourseDetail />} />
          <Route path="/admin/course-builder" element={<CourseBuilder />} />
          <Route path="/admin/assignments" element={<AssignmentPage />} />
          <Route path="/admin/copilot" element={<Copilot />} />
          <Route path="/admin/threat-intelligence" element={<ThreatIntelligence />} />
          <Route path="/admin/threat-intelligence/:id" element={<ThreatTrendDetail />} />
          <Route path="/admin/phishing-tests" element={<PhishingTestsPage />} />
          <Route path="/admin/security-dashboard" element={<SecurityDashboardPage />} />
          <Route path="/admin/hiring" element={<HiringDashboard />} />
          <Route path="/admin/hiring/roles" element={<HiringRolesList />} />
          <Route path="/admin/hiring/roles/new" element={<RoleBuilder />} />
          <Route path="/admin/hiring/roles/:id" element={<RoleDetail />} />
          <Route path="/admin/hiring/candidates" element={<CandidatesList />} />
          <Route path="/admin/hiring/candidates/:id" element={<CandidateDetail />} />
          <Route path="/admin/onboarding" element={<AdminOnboardingDashboard />} />
          <Route path="/admin/onboarding/:employeeId" element={<OnboardingPlanView />} />
          {/* Onboarding OS (HR side) */}
          <Route path="/admin/onboarding-os" element={<HRDashboardOS />} />
          <Route path="/admin/onboarding-os/templates" element={<TemplatesList />} />
          <Route path="/admin/onboarding-os/templates/:id" element={<TemplateDetail />} />
          <Route path="/admin/onboarding-os/instances/new" element={<OSInstanceCreate />} />
          <Route path="/admin/onboarding-os/manager" element={<ManagerDashboardPage />} />
          <Route path="/admin/onboarding-os/supervisor" element={<SupervisorDashboardPage />} />
        </Route>

        {/*
         * Shared instance-detail page — readable by anyone on the owner
         * chain (manager / supervisor / buddy / IT) plus admin. Mutations
         * are still gated server-side by get_current_admin where applicable.
         * Renders inside AdminLayout, whose sidebar auto-switches to the
         * logged-in role's nav config so non-admins see their own links.
         */}
        <Route
          element={
            <ProtectedRoute roles={["admin", "manager", "supervisor", "buddy", "it"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/onboarding-os/instances/:id" element={<OSInstanceDetail />} />
        </Route>

        {/* Learner */}
        <Route
          element={
            <ProtectedRoute roles="learner">
              <LearnerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/learner" element={<Navigate to="/learner/dashboard" replace />} />
          <Route path="/learner/dashboard" element={<LearnerDashboard />} />
          <Route path="/learner/courses/:id" element={<CoursePlayer />} />
          <Route path="/learner/certificates/:id" element={<CertificatePage />} />
          <Route path="/learner/security-challenge/:id" element={<SecurityChallenge />} />
          <Route path="/learner/onboarding" element={<LearnerOnboarding />} />
          <Route path="/learner/onboarding/:moduleIndex" element={<OnboardingModule />} />
          <Route path="/learner/onboarding-os/timeline" element={<OSTimeline />} />
        </Route>

        {/* Manager + Supervisor — shared compact layout */}
        <Route
          element={
            <ProtectedRoute roles={["manager", "supervisor"]}>
              <RoleLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/supervisor" element={<SupervisorDashboardPage />} />
        </Route>

        {/* Buddy — dedicated layout + sub-routes */}
        <Route
          element={
            <ProtectedRoute roles="buddy">
              <BuddyLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/buddy" element={<Navigate to="/buddy/dashboard" replace />} />
          <Route path="/buddy/dashboard" element={<BuddyDashboard />} />
          <Route path="/buddy/new-hires" element={<BuddyNewHires />} />
          <Route path="/buddy/new-hires/:id" element={<BuddyNewHireDetail />} />
          <Route path="/buddy/check-ins" element={<BuddyCheckIns />} />
          <Route path="/buddy/check-ins/new" element={<BuddyCheckInForm />} />
          <Route path="/buddy/help-requests" element={<BuddyHelpRequests />} />
        </Route>

        {/* IT — dedicated layout + sub-routes */}
        <Route
          element={
            <ProtectedRoute roles="it">
              <ITLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/it" element={<Navigate to="/it/dashboard" replace />} />
          <Route path="/it/dashboard" element={<ITDashboard />} />
          <Route path="/it/tasks" element={<ITTasksAll />} />
          <Route path="/it/tasks/pending" element={<ITPendingTasks />} />
          <Route path="/it/tasks/overdue" element={<ITOverdueTasks />} />
          <Route path="/it/tasks/blocked" element={<ITBlockedTasks />} />
          <Route path="/it/employees/:id/setup" element={<ITEmployeeSetup />} />
          <Route path="/it/assets" element={<ITAssets />} />
        </Route>

        {/* Candidate portal */}
        <Route
          element={
            <RequireCandidate>
              <CandidateLayout />
            </RequireCandidate>
          }
        >
          <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/training/:moduleId" element={<CandidateTraining />} />
          <Route path="/candidate/ai-interview" element={<AIInterview />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
