import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Compass,
  Cpu,
  Hourglass,
  Laptop,
  PackageCheck,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate, riskColor } from "@/lib/utils";

export function ITDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const employeeId = user?.employee_id;

  const dash = useQuery({
    queryKey: ["it-dash", employeeId],
    queryFn: () => OnboardingOS.itDashboard(employeeId!),
    enabled: !!employeeId,
  });

  const markDone = useMutation({
    mutationFn: (taskId: number) =>
      OnboardingOS.reviewTask(taskId, {
        decision: "approved",
        from_role: "it",
        comment: "Setup verified by IT.",
        score: 100,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-dash", employeeId] }),
  });

  if (!employeeId) {
    return (
      <Empty
        title="You're not linked to an employee record"
        description="Ask HR to link your account to an Employee row to use the IT dashboard."
      />
    );
  }
  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data)
    return (
      <Empty
        icon={<Laptop className="h-5 w-5" />}
        title="Could not load setup queue"
      />
    );

  const d = dash.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Compass className="mr-2 inline h-6 w-6 text-cyan-600" /> IT mode —{" "}
          {d.it_name}
        </h1>
        <p className="text-sm text-slate-500">
          Laptop, accounts, tooling and access-setup tasks for every onboarding
          you own.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">New hires</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {d.new_hires.length}
          </div>
          <div className="text-xs text-slate-500">where you're IT owner</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">Pending setup</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {d.pending_setup_tasks.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">Completed</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            {d.completed_setup_tasks}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">Overdue</div>
          <div
            className={`mt-1 text-2xl font-bold ${
              d.overdue_tasks > 0 ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {d.overdue_tasks}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <PackageCheck className="mr-2 inline h-4 w-4" /> Setup queue
          </CardTitle>
          <Badge>{d.pending_setup_tasks.length}</Badge>
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
              {d.pending_setup_tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/onboarding-os/instances/${t.instance_id}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700"
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
                    {t.description && (
                      <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(
                        t.due_date && new Date(t.due_date) < new Date()
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
                      <div className="font-semibold text-slate-900">
                        {c.employee_name}
                      </div>
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
