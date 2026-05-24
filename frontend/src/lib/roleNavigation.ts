/**
 * Single source of truth for sidebar / top-bar links per role.
 *
 * The layout components import ``NAV_BY_ROLE`` and render it directly. Adding
 * a link is a one-line change here — no per-layout edits.
 */
import {
  Activity,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CheckCircle2,
  Cpu,
  FileText,
  GraduationCap,
  HandHelping,
  HardHat,
  Hand,
  HelpCircle,
  Hourglass,
  Laptop,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  Plus,
  Radar,
  Rocket,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import type { Role } from "./api";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

export const NAV_BY_ROLE: Record<string, { label: string; items: NavItem[] }[]> = {
  admin: [
    {
      label: "Training",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/employees", label: "Employees", icon: Users },
        { to: "/admin/courses", label: "Courses", icon: BookOpen },
        { to: "/admin/course-builder", label: "AI Course Builder", icon: Sparkles },
        { to: "/admin/assignments", label: "Assignments", icon: ClipboardList },
      ],
    },
    {
      label: "Hiring",
      items: [
        { to: "/admin/hiring", label: "Hiring Dashboard", icon: Briefcase },
        { to: "/admin/hiring/roles", label: "Job Roles", icon: GraduationCap },
        { to: "/admin/hiring/candidates", label: "Candidates", icon: Users },
      ],
    },
    {
      label: "Onboarding OS",
      items: [
        { to: "/admin/onboarding-os", label: "HR Dashboard", icon: Compass },
        { to: "/admin/onboarding-os/templates", label: "Templates", icon: ClipboardCheck },
        { to: "/admin/onboarding-os/instances/new", label: "Assign New Hire", icon: Plus },
        { to: "/admin/onboarding-os/manager", label: "Manager View", icon: Briefcase },
        { to: "/admin/onboarding-os/supervisor", label: "Supervisor View", icon: HardHat },
      ],
    },
    {
      label: "Security",
      items: [
        { to: "/admin/threat-intelligence", label: "Threat Intelligence", icon: Radar },
        { to: "/admin/security-dashboard", label: "Security Awareness", icon: ShieldAlert },
      ],
    },
  ],
  manager: [
    {
      label: "Manager",
      items: [
        { to: "/admin/onboarding-os/manager", label: "My new hires", icon: LayoutDashboard, end: true },
        { to: "/admin/onboarding-os", label: "All onboardings", icon: Compass },
      ],
    },
  ],
  supervisor: [
    {
      label: "Supervisor",
      items: [
        { to: "/admin/onboarding-os/supervisor", label: "Practical work", icon: HardHat, end: true },
      ],
    },
  ],
  buddy: [
    {
      label: "Buddy",
      items: [
        { to: "/buddy/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/buddy/new-hires", label: "Assigned new hires", icon: Users },
        { to: "/buddy/check-ins", label: "Check-ins", icon: CheckCircle2 },
        { to: "/buddy/check-ins/new", label: "New check-in", icon: Plus },
        { to: "/buddy/help-requests", label: "Help requests", icon: HandHelping },
      ],
    },
  ],
  it: [
    {
      label: "IT setup",
      items: [
        { to: "/it/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/it/tasks", label: "All tasks", icon: PackageCheck },
        { to: "/it/tasks/pending", label: "Pending", icon: Hourglass },
        { to: "/it/tasks/overdue", label: "Overdue", icon: Hourglass },
        { to: "/it/tasks/blocked", label: "Blocked", icon: ShieldAlert },
        { to: "/it/assets", label: "Assets", icon: Laptop },
      ],
    },
  ],
  learner: [
    {
      label: "Me",
      items: [
        { to: "/learner/dashboard", label: "My courses", icon: BookOpen },
        { to: "/learner/onboarding-os/timeline", label: "Onboarding timeline", icon: Compass },
      ],
    },
  ],
};

export function navFor(role: Role | string | undefined): { label: string; items: NavItem[] }[] {
  if (!role) return [];
  return NAV_BY_ROLE[role] ?? [];
}

// Re-export commonly-used icons so pages that consume the nav config don't
// need a separate Lucide import.
export {
  Activity,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CheckCircle2,
  Cpu,
  FileText,
  GraduationCap,
  HandHelping,
  HardHat,
  Hand,
  HelpCircle,
  Hourglass,
  Laptop,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  Plus,
  Radar,
  Rocket,
  ShieldAlert,
  Sparkles,
  Users,
};
