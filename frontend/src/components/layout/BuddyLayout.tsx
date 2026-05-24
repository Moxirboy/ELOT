import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Hand, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { navFor } from "@/lib/roleNavigation";
import { cn } from "@/lib/utils";

export function BuddyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = navFor("buddy");

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Logo />
        </div>
        <div className="px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">
            <Hand className="h-3.5 w-3.5" /> Buddy mode
          </span>
          {user?.full_name && (
            <p className="mt-2 text-sm font-medium text-slate-900">
              {user.full_name}
            </p>
          )}
        </div>
        <nav className="mt-4 flex-1 space-y-4 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300",
                        isActive
                          ? "bg-pink-50 text-pink-700"
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
          <div className="rounded-xl bg-pink-50/60 p-3 text-pink-800">
            Buddy check-ins are visible to HR + the new hire's manager. They
            never affect formal review scores.
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
                {user?.full_name ?? "—"}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
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
