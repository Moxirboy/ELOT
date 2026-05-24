import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Hourglass,
  PackageCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { OnboardingOS, type OnbTaskShape } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatDate, riskColor } from "@/lib/utils";

type Variant = "all" | "pending" | "overdue" | "blocked";

const TITLES: Record<Variant, { title: string; subtitle: string; icon: typeof PackageCheck }> = {
  all: {
    title: "All IT tasks",
    subtitle: "Every it_setup task across every onboarding instance.",
    icon: PackageCheck,
  },
  pending: {
    title: "Pending IT tasks",
    subtitle: "Not yet completed or approved.",
    icon: Hourglass,
  },
  overdue: {
    title: "Overdue IT tasks",
    subtitle: "Due date passed without sign-off.",
    icon: ShieldAlert,
  },
  blocked: {
    title: "Blocked IT tasks",
    subtitle: "Setup paused on a blocker. Update status when resolved.",
    icon: ShieldAlert,
  },
};

export function ITTaskList({ variant }: { variant: Variant }) {
  const qc = useQueryClient();
  const meta = TITLES[variant];
  const Icon = meta.icon;

  const queryFn =
    variant === "pending"
      ? OnboardingOS.itTasksPending
      : variant === "overdue"
        ? OnboardingOS.itTasksOverdue
        : variant === "blocked"
          ? OnboardingOS.itTasksBlocked
          : () => OnboardingOS.itTasks();

  const tasks = useQuery({
    queryKey: ["it-tasks", variant],
    queryFn,
  });

  const complete = useMutation({
    mutationFn: ({ taskId, note, asset_id }: { taskId: number; note?: string; asset_id?: string }) =>
      OnboardingOS.itCompleteTask(taskId, { note, asset_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-tasks"] }),
  });
  const block = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason: string }) =>
      OnboardingOS.itBlockTask(taskId, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["it-tasks"] }),
  });

  const [completeFor, setCompleteFor] = useState<OnbTaskShape | null>(null);
  const [blockFor, setBlockFor] = useState<OnbTaskShape | null>(null);
  const [note, setNote] = useState("");
  const [assetId, setAssetId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Icon className="mr-2 inline h-6 w-6 text-cyan-600" /> {meta.title}
        </h1>
        <p className="text-sm text-slate-500">{meta.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <Badge>{tasks.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !tasks.data || tasks.data.length === 0 ? (
            <Empty
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Nothing in this view"
              description="Check the other tabs for active work."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Task</th>
                    <th className="px-4 py-2">Due</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Priority</th>
                    <th className="px-4 py-2">Assigned by</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.data.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          to={`/admin/onboarding-os/instances/${t.instance_id}`}
                          className="hover:text-cyan-700"
                        >
                          {t.assigned_to_name ?? `#${t.assigned_to_employee_id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        instance #{t.instance_id}
                      </td>
                      <td className="px-4 py-3">{t.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t.due_date ? formatDate(t.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-500">
                        {t.priority}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t.assigned_by_role.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {t.status !== "blocked" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBlockFor(t);
                                setBlockReason("");
                              }}
                            >
                              <XCircle className="h-4 w-4" /> Block
                            </Button>
                          )}
                          {t.status !== "completed" && t.status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCompleteFor(t);
                                setNote("");
                                setAssetId("");
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" /> Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {completeFor && (
        <Modal
          open
          onClose={() => setCompleteFor(null)}
          title={`Complete: ${completeFor.title}`}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setCompleteFor(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  complete.mutate(
                    {
                      taskId: completeFor.id,
                      note: note || undefined,
                      asset_id: assetId || undefined,
                    },
                    { onSuccess: () => setCompleteFor(null) },
                  )
                }
                loading={complete.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <Field label="Asset / device ID (optional)">
              <Input
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="LPT-2026-0042"
              />
            </Field>
            <Field label="Completion note (optional)">
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Laptop handed over in person; MFA + VPN verified."
              />
            </Field>
          </div>
        </Modal>
      )}

      {blockFor && (
        <Modal
          open
          onClose={() => setBlockFor(null)}
          title={`Mark blocked: ${blockFor.title}`}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setBlockFor(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  block.mutate(
                    { taskId: blockFor.id, reason: blockReason },
                    { onSuccess: () => setBlockFor(null) },
                  )
                }
                loading={block.isPending}
                disabled={!blockReason.trim()}
              >
                <XCircle className="h-4 w-4" /> Mark blocked
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <Field label="Blocker reason" required>
              <Textarea
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Vendor outage on SAML SSO endpoint — ETA 24h."
              />
            </Field>
            <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
              HR + the new hire will see this reason on their timeline.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ITTasksAll() {
  return <ITTaskList variant="all" />;
}
export function ITPendingTasks() {
  return <ITTaskList variant="pending" />;
}
export function ITOverdueTasks() {
  return <ITTaskList variant="overdue" />;
}
export function ITBlockedTasks() {
  return <ITTaskList variant="blocked" />;
}
