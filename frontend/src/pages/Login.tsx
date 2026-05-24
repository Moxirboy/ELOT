import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Compass,
  GraduationCap,
  Hand,
  HardHat,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { fetchRoleOptions, type RoleOptionEmployee } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/roleRedirect";

type OSRole = "manager" | "supervisor" | "buddy" | "it";

const ROLE_META: Record<
  OSRole,
  { label: string; icon: typeof Briefcase; tone: string }
> = {
  manager: {
    label: "Manager",
    icon: Briefcase,
    tone: "from-indigo-500 to-blue-500",
  },
  supervisor: {
    label: "Supervisor",
    icon: HardHat,
    tone: "from-amber-500 to-orange-500",
  },
  buddy: {
    label: "Buddy",
    icon: Hand,
    tone: "from-pink-500 to-rose-500",
  },
  it: {
    label: "IT owner",
    icon: Compass,
    tone: "from-cyan-500 to-teal-500",
  },
};

export function Login() {
  const navigate = useNavigate();
  const { loginAdmin, loginLearner, loginRole } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<OSRole | null>(null);

  const roleOptions = useQuery({
    queryKey: ["role-options"],
    queryFn: fetchRoleOptions,
  });

  async function go(role: "admin" | "learner") {
    setError(null);
    setPending(role);
    try {
      if (role === "admin") {
        const u = await loginAdmin();
        navigate(homeForRole(u.role));
      } else {
        const u = await loginLearner();
        navigate(homeForRole(u.role));
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not connect. Is the backend running on :8000?";
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  async function pickRole(role: OSRole, employeeId: number) {
    setError(null);
    setPending(role);
    try {
      const u = await loginRole(role, employeeId);
      navigate(homeForRole(u.role));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : `Could not log in as ${role}.`;
      setError(msg);
    } finally {
      setPending(null);
      setPickerOpen(null);
    }
  }

  const optionsFor = (role: OSRole): RoleOptionEmployee[] => {
    if (!roleOptions.data) return [];
    if (role === "manager") return roleOptions.data.managers;
    if (role === "supervisor") return roleOptions.data.supervisors;
    if (role === "buddy") return roleOptions.data.buddies;
    return roleOptions.data.it_owners;
  };

  return (
    <div className="min-h-screen bg-hero bg-grid">
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to landing
        </Link>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12">
        <Logo />
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Start the ELOT AI demo
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          No signup needed. Pick a role to continue.
        </p>

        <Card className="mt-8 w-full p-6">
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => go("admin")}
              loading={pending === "admin"}
              disabled={pending !== null}
            >
              <Shield className="h-5 w-5" /> Continue as Admin / HR
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => go("learner")}
              loading={pending === "learner"}
              disabled={pending !== null}
            >
              <GraduationCap className="h-5 w-5" /> Continue as Learner
            </Button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-3.5 w-3.5" /> Onboarding OS roles
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Log in as a real person from the seeded onboarding chain — each
              role lands on their own dashboard.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_META) as OSRole[]).map((r) => {
                const meta = ROLE_META[r];
                const count = optionsFor(r).length;
                const Icon = meta.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setPickerOpen(r)}
                    disabled={pending !== null || count === 0}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${meta.tone}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {meta.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {count} {count === 1 ? "person" : "people"}
                        </div>
                      </div>
                    </div>
                    <UserCheck className="h-4 w-4 text-slate-400 transition group-hover:text-brand-600" />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-rose-600">{error}</p>
          )}
          <p className="mt-4 text-center text-xs text-slate-500">
            Demo accounts seed instantly inside{" "}
            <strong>GDG Demo Corp</strong>. AI features fall back to sample
            content if no API key is set.
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Looking for the candidate portal?{" "}
          <Link
            to="/candidate/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Continue here →
          </Link>
        </p>
      </div>

      {pickerOpen && (
        <Modal
          open
          onClose={() => setPickerOpen(null)}
          title={`Continue as ${ROLE_META[pickerOpen].label}`}
          description="Pick a seeded employee to log in as them in this role."
          size="md"
          footer={
            <Button variant="outline" onClick={() => setPickerOpen(null)}>
              Cancel
            </Button>
          }
        >
          {optionsFor(pickerOpen).length === 0 ? (
            <p className="text-sm text-slate-500">
              No employees serve as {ROLE_META[pickerOpen].label.toLowerCase()}{" "}
              on any active onboarding yet. Seed the demo first or assign a
              chain to an instance.
            </p>
          ) : (
            <ul className="space-y-2">
              {optionsFor(pickerOpen).map((opt) => (
                <li key={opt.employee_id}>
                  <button
                    onClick={() => pickRole(pickerOpen, opt.employee_id)}
                    disabled={pending !== null}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-900">
                        {opt.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {opt.department}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      {opt.instance_count} active hire
                      {opt.instance_count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
