import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, LogOut, BookOpen, Rocket, Compass } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export function LearnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden gap-2 md:flex">
              <NavLink
                to="/learner/dashboard"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                <Home className="h-4 w-4" /> Dashboard
              </NavLink>
              <NavLink
                to="/learner/dashboard"
                className={() =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  )
                }
                end
              >
                <BookOpen className="h-4 w-4" /> My Courses
              </NavLink>
              <NavLink
                to="/learner/onboarding"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                <Rocket className="h-4 w-4" /> Onboarding
              </NavLink>
              <NavLink
                to="/learner/onboarding-os/timeline"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                <Compass className="h-4 w-4" /> Timeline
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                {user?.full_name ?? "Learner"}
              </div>
              <div className="text-xs text-slate-500">Learner</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-brand-500 text-sm font-semibold text-white">
              {(user?.full_name ?? "L").slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
