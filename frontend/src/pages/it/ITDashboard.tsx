import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  Compass,
  Cpu,
  Hourglass,
  Laptop,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { formatDate, riskColor } from "@/lib/utils";

export function ITDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const employeeId = user?.employee_id;

  const dash = useQuery({
    queryKey: ["it-dash", employeeId],
    queryFn: () => OnboardingOS.itDashboard(employeeId!),
    enabled: !!employeeId,
  });
  const markDone = useMutation({
    mutationFn: (taskId: number) => OnboardingOS.itCompleteTask(taskId, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-dash", employeeId] }),
  });

  if (!employeeId) {
    return (
      <Empty
        title="No employee record linked"
        description="Ask HR to link your account to an Employee row."
      />
    );
  }
  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data)
    return <Empty icon={<Laptop className="h-5 w-5" />} title="Could not load IT dashboard" />;

  const d = dash.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Compass className="mr-2 inline h-6 w-6 text-cyan-600" /> IT mode —{" "}
          {d.it_name}
        </h1>
        <p className="text-sm text-slate-500">
          Setup tasks for every onboarding where you're IT owner.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Pending"
          value={d.pending_setup_tasks.length}
          icon={<Hourglass className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Due today"
          value={d.due_today}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue"
          value={d.overdue_tasks}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone={d.overdue_tasks > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Blocked"
          value={d.blocked_tasks}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone={d.blocked_tasks > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Completed (week)"
          value={d.completed_this_week}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="New hires"
          value={d.new_hires.length}
          icon={<Cpu className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <PackageCheck className="mr-2 inline h-4 w-4" /> Top of your queue
          </CardTitle>
          <Link
            to="/it/tasks/pending"
            className="text-xs font-medium text-cyan-600 hover:underline"
          >
            See all pending →
          </Link>
        </CardHeader>
        <CardContent>
          {d.pending_setup_tasks.length === 0 ? (
            <Empty
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="All caught up"
              description="No pending IT setup tasks."
            />
          ) : (
            <ul className="space-y-2">
              {d.pending_setup_tasks.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/onboarding-os/instances/${t.instance_id}`}
                      className="text-sm font-medium text-slate-900 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      {t.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      For <strong>{t.assigned_to_name}</strong> · due{" "}
                      {t.due_date ? (
                        formatDate(t.due_date)
                      ) : (
                        <span className="text-slate-400">no deadline</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(
                        t.status === "blocked"
                          ? "high"
                          : t.due_date && new Date(t.due_date) < new Date()
                            ? "high"
                            : "medium",
                      )}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => markDone.mutate(t.id)}
                      loading={markDone.isPending && markDone.variables === t.id}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark done
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Cpu className="mr-2 inline h-4 w-4" /> Hires you own
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.new_hires.length === 0 ? (
            <p className="text-sm text-slate-500">
              No active onboardings list you as IT owner yet.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {d.new_hires.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-slate-100 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/it/employees/${c.employee_id}/setup`}
                        className="font-semibold text-slate-900 hover:text-cyan-700"
                      >
                        {c.employee_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {c.role_name} · started {formatDate(c.start_date)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(c.risk_level)}`}
                    >
                      {c.current_stage.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Hourglass className="h-3 w-3" /> {c.overdue_tasks} overdue
                    · {c.open_tasks} open
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
