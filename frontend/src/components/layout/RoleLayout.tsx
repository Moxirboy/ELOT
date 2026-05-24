import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  HardHat,
  Hand,
  LogOut,
  Briefcase,
  Compass,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Briefcase; tone: string; nav: { to: string; label: string }[] }
> = {
  manager: {
    label: "Manager mode",
    icon: Briefcase,
    tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    nav: [{ to: "/manager", label: "My new hires" }],
  },
  supervisor: {
    label: "Supervisor mode",
    icon: HardHat,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    nav: [{ to: "/supervisor", label: "Practical work" }],
  },
  buddy: {
    label: "Buddy mode",
    icon: Hand,
    tone: "bg-pink-50 text-pink-700 border-pink-200",
    nav: [{ to: "/buddy", label: "My check-ins" }],
  },
  it: {
    label: "IT mode",
    icon: Compass,
    tone: "bg-cyan-50 text-cyan-700 border-cyan-200",
    nav: [{ to: "/it", label: "Setup queue" }],
  },
};

/**
 * Lightweight layout used by manager / supervisor / buddy / IT role views.
 * One top bar + outlet — no sidebar; each role has at most a couple of
 * pages right now.
 */
export function RoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const meta = ROLE_META[user?.role ?? ""] ?? ROLE_META.manager;
  const RoleIcon = meta.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Logo />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                meta.tone,
              )}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            <nav className="hidden gap-2 md:flex">
              {meta.nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100",
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                {user?.full_name ?? "—"}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
