import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Sparkles,
  ClipboardList,
  Bot,
  Briefcase,
  ClipboardCheck,
  Compass,
  GraduationCap,
  HardHat,
  LogOut,
  Radar,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  FishSymbol,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/roleNavigation";

const ADMIN_NAV: { to: string; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Training" },
  { to: "/admin/employees", label: "Employees", icon: Users, group: "Training" },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, group: "Training" },
  { to: "/admin/course-builder", label: "AI Course Builder", icon: Sparkles, group: "Training" },
  { to: "/admin/assignments", label: "Assignments", icon: ClipboardList, group: "Training" },
  { to: "/admin/copilot", label: "AI Copilot", icon: Bot, group: "Training" },
  { to: "/admin/hiring", label: "Hiring Dashboard", icon: Briefcase, group: "Hiring" },
  { to: "/admin/hiring/roles", label: "Job Roles", icon: GraduationCap, group: "Hiring" },
  { to: "/admin/hiring/candidates", label: "Candidates", icon: UserPlus, group: "Hiring" },
  { to: "/admin/onboarding", label: "Onboarding (basic)", icon: Rocket, group: "Hiring" },
  { to: "/admin/onboarding-os", label: "Onboarding OS", icon: Compass, group: "Onboarding OS" },
  { to: "/admin/onboarding-os/templates", label: "Templates", icon: ClipboardCheck, group: "Onboarding OS" },
  { to: "/admin/onboarding-os/manager", label: "Manager view", icon: Briefcase, group: "Onboarding OS" },
  { to: "/admin/onboarding-os/supervisor", label: "Supervisor view", icon: HardHat, group: "Onboarding OS" },
  { to: "/admin/threat-intelligence", label: "Threat Intelligence", icon: Radar, group: "Security" },
  { to: "/admin/phishing-tests", label: "Phishing Tests", icon: FishSymbol, group: "Security" },
  { to: "/admin/security-dashboard", label: "Security Awareness", icon: ShieldCheck, group: "Security" },
];

function navForCurrentRole(
  role: string | undefined,
): { label: string; items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] }[] {
  // Admin gets the full admin sidebar; any other role borrowing the
  // AdminLayout (e.g. visiting a shared instance-detail page) sees their own
  // role's nav from the shared config.
  if (role === "admin") {
    const groups = Array.from(new Map(ADMIN_NAV.map((n) => [n.group ?? "", null])).keys());
    return groups.map((group) => ({
      label: group,
      items: ADMIN_NAV.filter((n) => (n.group ?? "") === group),
    }));
  }
  return navFor(role);
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navGroups = navForCurrentRole(user?.role);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-4 px-3 py-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              {group.label && (
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100",
                      )
                    }
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <div className="mb-1 flex items-center gap-1 font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              Responsible AI
            </div>
            AI-generated training requires admin review. ELOT AI is not legal advice.
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-6 backdrop-blur">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                {user?.full_name ?? "Admin"}
              </div>
              <div className="text-xs text-slate-500">
                {user?.email ?? "admin@elot.ai"} · Admin
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white">
              {(user?.full_name ?? "A").slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
