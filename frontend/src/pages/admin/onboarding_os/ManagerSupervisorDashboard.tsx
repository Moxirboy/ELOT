/**
 * Two thin dashboards bound to a single Employee.id — Manager / Supervisor.
 *
 * Behaviour by login role:
 * - When logged in as a manager / supervisor, the employee_id is derived
 *   from `/auth/me` and the picker is hidden.
 * - When logged in as admin, an employee picker is shown so HR can see any
 *   manager's or supervisor's view of the world.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Hourglass,
  ShieldCheck,
} from "lucide-react";
import { Employees, OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Field, Select } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate, riskColor } from "@/lib/utils";

export function ManagerDashboardPage() {
  return <RoleDashboard mode="manager" />;
}

export function SupervisorDashboardPage() {
  return <RoleDashboard mode="supervisor" />;
}

function RoleDashboard({ mode }: { mode: "manager" | "supervisor" }) {
  const { user } = useAuth();
  const isSelf =
    (mode === "manager" && user?.role === "manager") ||
    (mode === "supervisor" && user?.role === "supervisor");
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: Employees.list,
    enabled: !isSelf, // HR picker only needed for admin view
  });
  const [pickedId, setPickedId] = useState<number>(0);
  const employeeId = isSelf ? user?.employee_id ?? 0 : pickedId;
  const setEmployeeId = setPickedId;

  const mgr = useQuery({
    queryKey: ["os-mgr", employeeId],
    queryFn: () => OnboardingOS.managerDashboard(employeeId),
    enabled: mode === "manager" && employeeId > 0,
  });
  const sup = useQuery({
    queryKey: ["os-sup", employeeId],
    queryFn: () => OnboardingOS.supervisorDashboard(employeeId),
    enabled: mode === "supervisor" && employeeId > 0,
  });

  const data = mode === "manager" ? mgr.data : sup.data;
  const isLoading = mode === "manager" ? mgr.isLoading : sup.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <ClipboardCheck className="mr-2 inline h-6 w-6 text-brand-600" />
          {mode === "manager" ? "Manager dashboard" : "Supervisor dashboard"}
        </h1>
        <p className="text-sm text-slate-500">
          {mode === "manager"
            ? "New hires you own, pending 30/60/90 reviews, risk signals."
            : "Practical tasks awaiting your sign-off and your new hires' practical scores."}
        </p>
      </div>

      {!isSelf && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Field label="View as">
              <Select
                value={employeeId || ""}
                onChange={(e) => setEmployeeId(Number(e.target.value) || 0)}
              >
                <option value="">Pick an employee…</option>
                {(employees.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-slate-500">
              HR view — pick whose dashboard to look at. (Managers /
              supervisors logged in directly skip this picker.)
            </p>
          </CardContent>
        </Card>
      )}

      {!employeeId ? (
        <Empty
          title="Pick a person above"
          description="Choose whose dashboard to view."
        />
      ) : isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data ? (
        <Empty
          title="No data"
          description={`This person doesn't appear to be a ${mode} on any active onboarding.`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="New hires"
              value={data.new_hires.length}
              icon={<Eye className="h-5 w-5" />}
            />
            {mode === "manager" ? (
              <>
                <StatCard
                  label="Pending reviews"
                  value={(data as typeof mgr.data)!.pending_reviews}
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  tone="warning"
                />
                <StatCard
                  label="Overdue tasks"
                  value={(data as typeof mgr.data)!.overdue_tasks}
                  icon={<Hourglass className="h-5 w-5" />}
                  tone={
                    (data as typeof mgr.data)!.overdue_tasks > 0
                      ? "danger"
                      : "default"
                  }
                />
                <StatCard
                  label="High-risk"
                  value={(data as typeof mgr.data)!.high_risk_count}
                  icon={<AlertOctagon className="h-5 w-5" />}
                  tone={
                    (data as typeof mgr.data)!.high_risk_count > 0
                      ? "danger"
                      : "success"
                  }
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Tasks awaiting review"
                  value={(data as typeof sup.data)!.pending_review_tasks.length}
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  tone="warning"
                />
                <StatCard
                  label="Overdue"
                  value={(data as typeof sup.data)!.overdue_tasks}
                  icon={<Hourglass className="h-5 w-5" />}
                  tone={
                    (data as typeof sup.data)!.overdue_tasks > 0
                      ? "danger"
                      : "default"
                  }
                />
                <StatCard
                  label="Avg practical score"
                  value={(data as typeof sup.data)!.avg_practical_score.toFixed(
                    0,
                  )}
                  icon={<ShieldCheck className="h-5 w-5" />}
                />
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your new hires</CardTitle>
              <Badge>{data.new_hires.length}</Badge>
            </CardHeader>
            <CardContent>
              {data.new_hires.length === 0 ? (
                <p className="text-sm text-slate-500">No new hires yet.</p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {data.new_hires.map((c) => (
                    <Link
                      key={c.id}
                      to={`/admin/onboarding-os/instances/${c.id}`}
                      className="rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {c.employee_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.role_name} · {c.department} · started{" "}
                            {formatDate(c.start_date)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(c.risk_level)}`}
                        >
                          {c.risk_level}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        {c.overall_progress}% · {c.overdue_tasks} overdue ·{" "}
                        {c.pending_reviews} pending reviews
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-brand-700">
                        View instance <ArrowRight className="h-3 w-3" />
                      </div>
                    </Link>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {mode === "supervisor" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
                  Tasks awaiting your review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(data as typeof sup.data)!.pending_review_tasks.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nothing pending — caught up.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(data as typeof sup.data)!.pending_review_tasks.map(
                      (t) => (
                        <li
                          key={t.id}
                          className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
                        >
                          <div>
                            <Link
                              to={`/admin/onboarding-os/instances/${t.instance_id}`}
                              className="text-sm font-medium text-slate-900 hover:text-brand-700"
                            >
                              {t.title}
                            </Link>
                            <div className="text-xs text-slate-500">
                              {t.assigned_to_name} · due{" "}
                              {t.due_date ? formatDate(t.due_date) : "—"}
                            </div>
                          </div>
                          <Badge tone="warning" className="capitalize">
                            {t.status.replace("_", " ")}
                          </Badge>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
