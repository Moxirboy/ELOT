import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Hourglass,
  Laptop,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

const SYSTEM_ICONS: Record<string, typeof Laptop> = {
  laptop: Laptop,
  email: Cpu,
  vpn: ShieldAlert,
  default: Cpu,
};

function iconFor(title: string) {
  const lc = title.toLowerCase();
  if (lc.includes("laptop") || lc.includes("device")) return SYSTEM_ICONS.laptop;
  if (lc.includes("vpn")) return SYSTEM_ICONS.vpn;
  return SYSTEM_ICONS.default;
}

export function ITEmployeeSetup() {
  const { id } = useParams();
  const employeeId = Number(id);
  const qc = useQueryClient();

  const setup = useQuery({
    queryKey: ["it-setup", employeeId],
    queryFn: () => OnboardingOS.itEmployeeSetup(employeeId),
    enabled: !Number.isNaN(employeeId),
  });

  const complete = useMutation({
    mutationFn: (taskId: number) => OnboardingOS.itCompleteTask(taskId, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-setup", employeeId] }),
  });
  const block = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason: string }) =>
      OnboardingOS.itBlockTask(taskId, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-setup", employeeId] }),
  });

  if (setup.isLoading || !setup.data) {
    return <div className="text-slate-500">Loading…</div>;
  }

  const s = setup.data;
  if (!s.instance_id) {
    return (
      <Empty
        title="No active onboarding"
        description="This employee doesn't have an onboarding instance yet."
      />
    );
  }

  const completionPct = Math.round(s.completion_rate * 100);

  return (
    <div className="space-y-6">
      <Link
        to="/it/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {s.employee_name} — IT setup
          </h1>
          <p className="text-sm text-slate-500">
            Instance #{s.instance_id} · {s.items.length} setup items ·{" "}
            {completionPct}% complete
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup checklist</CardTitle>
          <Badge>{s.items.length}</Badge>
        </CardHeader>
        <CardContent>
          {s.items.length === 0 ? (
            <Empty
              title="No IT setup tasks on this instance"
              description="HR can add it_setup tasks via the template or instance editor."
            />
          ) : (
            <ul className="space-y-2">
              {s.items.map((it) => {
                const ItIcon = iconFor(it.title);
                const done = it.status === "completed" || it.status === "approved";
                const blocked = it.status === "blocked";
                return (
                  <li
                    key={it.task_id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          done
                            ? "bg-emerald-50 text-emerald-700"
                            : blocked
                              ? "bg-rose-50 text-rose-700"
                              : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        <ItIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {it.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {it.due_date ? `Due ${formatDate(it.due_date)}` : "No deadline"}
                          {it.asset_id && (
                            <> · Asset {it.asset_id}</>
                          )}
                          {it.reviewer_name && (
                            <> · Reviewer {it.reviewer_name}</>
                          )}
                        </div>
                        {blocked && it.blocker_reason && (
                          <div className="mt-1 text-xs text-rose-700">
                            Blocker: {it.blocker_reason}
                          </div>
                        )}
                        {done && it.completed_at && (
                          <div className="mt-1 text-xs text-emerald-700">
                            Completed {formatDate(it.completed_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          done ? "success" : blocked ? "danger" : "warning"
                        }
                        className="capitalize"
                      >
                        {it.status.replace("_", " ")}
                      </Badge>
                      {!done && (
                        <>
                          {!blocked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = window.prompt("Blocker reason?");
                                if (reason && reason.trim())
                                  block.mutate({ taskId: it.task_id, reason });
                              }}
                            >
                              <XCircle className="h-4 w-4" /> Block
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => complete.mutate(it.task_id)}
                            loading={
                              complete.isPending && complete.variables === it.task_id
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" /> Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
