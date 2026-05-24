import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  Hourglass,
  Sparkles,
  ThumbsUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  OnboardingOS,
  type OnbInstanceCard,
  type OnbReview,
  type OnbTaskShape,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { formatDate, formatDateTime, riskColor } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  preboarding: "Pre-boarding",
  day_1: "Day 1",
  week_1: "Week 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  extended: "Extended",
};
const STAGES = ["preboarding", "day_1", "week_1", "day_30", "day_60", "day_90", "extended"];

const STATUS_TONE: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-sky-100 text-sky-700 border-sky-200",
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  needs_review: "bg-amber-100 text-amber-700 border-amber-200",
  needs_improvement: "bg-rose-100 text-rose-700 border-rose-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
};

export function InstanceDetail() {
  const { id } = useParams();
  const instanceId = Number(id);
  const qc = useQueryClient();

  const instance = useQuery({
    queryKey: ["os-instance", instanceId],
    queryFn: () => OnboardingOS.getInstance(instanceId),
    enabled: !Number.isNaN(instanceId),
  });
  const tasks = useQuery({
    queryKey: ["os-tasks", instanceId],
    queryFn: () => OnboardingOS.listTasks(instanceId),
    enabled: !Number.isNaN(instanceId),
  });
  const reviews = useQuery({
    queryKey: ["os-reviews", instanceId],
    queryFn: () => OnboardingOS.listReviews(instanceId),
    enabled: !Number.isNaN(instanceId),
  });
  const recs = useQuery({
    queryKey: ["os-recs", instanceId],
    queryFn: () => OnboardingOS.recommendations(instanceId),
    enabled: !Number.isNaN(instanceId),
  });

  const analyze = useMutation({
    mutationFn: () => OnboardingOS.analyzeRisk(instanceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-recs", instanceId] });
      qc.invalidateQueries({ queryKey: ["os-instance", instanceId] });
    },
  });

  const review = useMutation({
    mutationFn: (body: Parameters<typeof OnboardingOS.createReview>[1]) =>
      OnboardingOS.createReview(instanceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-reviews", instanceId] });
      qc.invalidateQueries({ queryKey: ["os-instance", instanceId] });
    },
  });

  const taskReview = useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: number;
      body: Parameters<typeof OnboardingOS.reviewTask>[1];
    }) => OnboardingOS.reviewTask(taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-tasks", instanceId] });
      qc.invalidateQueries({ queryKey: ["os-instance", instanceId] });
    },
  });

  const [reviewModal, setReviewModal] = useState<
    null | "30_day" | "60_day" | "90_day" | "final"
  >(null);

  if (instance.isLoading || !instance.data) {
    return <div className="text-slate-500">Loading instance…</div>;
  }

  const inst = instance.data;
  const tasksByStage: Record<string, OnbTaskShape[]> = {};
  for (const t of tasks.data ?? []) {
    tasksByStage[t.stage] = [...(tasksByStage[t.stage] ?? []), t];
  }
  const latestRec = recs.data?.[0];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/onboarding-os"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-brand-600">
                {STAGE_LABEL[inst.current_stage] ?? inst.current_stage}
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {inst.employee_name} — {inst.role_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {inst.department} · started {formatDate(inst.start_date)} ·{" "}
                {inst.duration_days}-day plan
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(inst.risk_level)}`}
              >
                {inst.risk_level} risk · readiness {inst.readiness_score}
              </span>
              <Badge tone={inst.status === "completed" ? "success" : "brand"} className="capitalize">
                {inst.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
          <ProgressBar value={inst.overall_progress} />
          <OwnerChain inst={inst} />
        </CardContent>
      </Card>

      {/* Risk + recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Sparkles className="mr-2 inline h-4 w-4 text-brand-600" /> AI risk
            recommendation
          </CardTitle>
          <Button onClick={() => analyze.mutate()} loading={analyze.isPending}>
            <AlertOctagon className="h-4 w-4" /> Re-run analysis
          </Button>
        </CardHeader>
        <CardContent>
          {!latestRec ? (
            <p className="text-sm text-slate-500">
              No recommendation yet — run the analysis to generate one.
            </p>
          ) : (
            <div
              className={`rounded-2xl border p-4 ${riskColor(latestRec.risk_level)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide opacity-70">
                    Risk: {latestRec.risk_level}
                  </div>
                  <p className="text-sm font-medium">{latestRec.reason}</p>
                </div>
                <span className="text-[11px] opacity-70">
                  {formatDateTime(latestRec.created_at)}
                </span>
              </div>
              <div className="mt-2 text-sm">
                <strong>Recommended action:</strong>{" "}
                {latestRec.recommended_action}
              </div>
              {latestRec.recommended_training.length > 0 && (
                <div className="mt-1 text-sm">
                  <strong>Suggested training:</strong>{" "}
                  {latestRec.recommended_training.join(", ")}
                </div>
              )}
              <div className="mt-1 text-xs opacity-70">
                Notify: {latestRec.notify_roles.join(", ") || "—"}
              </div>
            </div>
          )}
          <p className="mt-3 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800">
            AI recommendation only — manager and HR co-sign every onboarding
            decision.
          </p>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ClipboardCheck className="mr-2 inline h-4 w-4" /> Manager reviews
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {(["30_day", "60_day", "90_day", "final"] as const).map((rt) => (
              <Button
                key={rt}
                size="sm"
                variant="outline"
                onClick={() => setReviewModal(rt)}
              >
                {rt === "final"
                  ? "Final review"
                  : rt.replace("_", "-").replace("day", "day review")}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {(reviews.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">
              No reviews logged yet. Open one above to start the 30/60/90 cadence.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {reviews.data!.map((r) => (
                <ReviewItem key={r.id} r={r} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tasks by stage */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Compass className="mr-2 inline h-4 w-4" /> Timeline (
            {tasks.data?.length ?? 0})
          </CardTitle>
          <Badge>{inst.overdue_tasks} overdue</Badge>
        </CardHeader>
        <CardContent>
          {STAGES.filter((s) => tasksByStage[s]?.length).map((s) => (
            <div key={s} className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2">
                  {STAGE_LABEL[s] ?? s}
                </span>
                <span className="text-slate-400">
                  {tasksByStage[s].length} task
                  {tasksByStage[s].length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="space-y-2">
                {tasksByStage[s].map((t) => (
                  <TaskRow
                    key={t.id}
                    t={t}
                    onApprove={() =>
                      taskReview.mutate({
                        taskId: t.id,
                        body: {
                          decision: "approved",
                          score: t.required_score ?? 80,
                          from_role: "supervisor",
                          comment: "Approved on review.",
                        },
                      })
                    }
                    onReject={() =>
                      taskReview.mutate({
                        taskId: t.id,
                        body: {
                          decision: "needs_improvement",
                          from_role: "supervisor",
                          comment: "Please address feedback and resubmit.",
                          weaknesses: "Awaiting more detail.",
                        },
                      })
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {reviewModal && (
        <ReviewModal
          type={reviewModal}
          onClose={() => setReviewModal(null)}
          onSave={(body) => {
            review.mutate({ ...body, review_type: reviewModal });
            setReviewModal(null);
          }}
          loading={review.isPending}
        />
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Overall progress</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function OwnerChain({ inst }: { inst: OnbInstanceCard }) {
  const slots: { label: string; name: string | null }[] = [
    { label: "Manager", name: inst.manager_name },
    { label: "Supervisor", name: inst.supervisor_name },
    { label: "Buddy", name: inst.buddy_name },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">
        <Users className="h-3 w-3" /> Owner chain:
      </span>
      {slots.map((s) => (
        <span
          key={s.label}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700"
        >
          <span className="font-semibold">{s.label}:</span>{" "}
          {s.name ?? <span className="text-slate-400">unassigned</span>}
        </span>
      ))}
    </div>
  );
}

function TaskRow({
  t,
  onApprove,
  onReject,
}: {
  t: OnbTaskShape;
  onApprove: () => void;
  onReject: () => void;
}) {
  const tone = STATUS_TONE[t.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900">{t.title}</div>
          <div className="text-xs text-slate-500">
            Assigned by <strong>{t.assigned_by_role.toUpperCase()}</strong> ·
            reviewer{" "}
            <strong>{t.reviewer_name ?? t.reviewer_role.toUpperCase()}</strong> ·
            due {t.due_date ? formatDate(t.due_date) : "—"}
            {typeof t.required_score === "number" && (
              <> · pass ≥ {t.required_score}</>
            )}
          </div>
          {t.description && (
            <div className="mt-1 text-xs text-slate-500 line-clamp-2">
              {t.description}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}
          >
            {t.status.replace("_", " ")}
          </span>
          {typeof t.score === "number" && (
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs">
              Score {t.score}
            </span>
          )}
          {t.status === "submitted" && (
            <>
              <Button size="sm" variant="outline" onClick={onApprove}>
                <ThumbsUp className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <XCircle className="h-4 w-4" /> Needs improvement
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function ReviewItem({ r }: { r: OnbReview }) {
  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-900">
            {r.review_type.replace("_", "-")} ·{" "}
            <span className="text-slate-500">
              {r.reviewer_name ?? "Reviewer"}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {formatDateTime(r.created_at)}
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs capitalize">
          {r.decision.replace("_", " ")}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-700">
        <ScoreCell label="Role clarity" v={r.role_clarity_score} />
        <ScoreCell label="Workflow" v={r.workflow_score} />
        <ScoreCell label="Communication" v={r.communication_score} />
        <ScoreCell label="Ownership" v={r.ownership_score} />
        <ScoreCell label="Productivity" v={r.productivity_score} />
        <ScoreCell label="Culture" v={r.culture_score} />
      </div>
      {r.strengths && (
        <div className="mt-2 text-sm text-emerald-700">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> {r.strengths}
        </div>
      )}
      {r.weaknesses && (
        <div className="mt-1 text-sm text-rose-700">
          <Hourglass className="mr-1 inline h-3.5 w-3.5" /> {r.weaknesses}
        </div>
      )}
      {r.next_goals && (
        <div className="mt-1 text-xs text-slate-500">
          <FileText className="mr-1 inline h-3.5 w-3.5" /> Goals: {r.next_goals}
        </div>
      )}
    </li>
  );
}

function ScoreCell({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2">
      <div className="text-[11px] uppercase text-slate-400">{label}</div>
      <div className="text-sm font-semibold">{v} / 5</div>
    </div>
  );
}

function ReviewModal({
  type,
  onClose,
  onSave,
  loading,
}: {
  type: "30_day" | "60_day" | "90_day" | "final";
  onClose: () => void;
  onSave: (body: {
    review_type: typeof type;
    role_clarity_score: number;
    workflow_score: number;
    communication_score: number;
    ownership_score: number;
    productivity_score: number;
    culture_score: number;
    strengths: string;
    weaknesses: string;
    next_goals: string;
    decision: string;
  }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    role_clarity_score: 4,
    workflow_score: 3,
    communication_score: 4,
    ownership_score: 4,
    productivity_score: 3,
    culture_score: 4,
    strengths: "",
    weaknesses: "",
    next_goals: "",
    decision: type === "final" ? "ready_with_support" : "pass",
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={`${type.replace("_", "-")} review`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ ...form, review_type: type } as never)}
            loading={loading}
          >
            <CheckCircle2 className="h-4 w-4" /> Save review
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["role_clarity_score", "Role clarity"],
            ["workflow_score", "Workflow"],
            ["communication_score", "Communication"],
            ["ownership_score", "Ownership"],
            ["productivity_score", "Productivity"],
            ["culture_score", "Culture"],
          ] as [keyof typeof form, string][]
        ).map(([k, label]) => (
          <Field key={k as string} label={label}>
            <Select
              value={form[k] as number}
              onChange={(e) =>
                setForm({ ...form, [k]: Number(e.target.value) } as typeof form)
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        <Field label="Strengths">
          <Textarea
            rows={2}
            value={form.strengths}
            onChange={(e) => setForm({ ...form, strengths: e.target.value })}
          />
        </Field>
        <Field label="Weaknesses / support needed">
          <Textarea
            rows={2}
            value={form.weaknesses}
            onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
          />
        </Field>
        <Field label="Next 30-day goals">
          <Textarea
            rows={2}
            value={form.next_goals}
            onChange={(e) => setForm({ ...form, next_goals: e.target.value })}
          />
        </Field>
        <Field label="Decision">
          <Select
            value={form.decision}
            onChange={(e) => setForm({ ...form, decision: e.target.value })}
          >
            {type === "final" ? (
              <>
                <option value="ready">Ready</option>
                <option value="ready_with_support">Ready with support</option>
                <option value="extended">Extend onboarding</option>
                <option value="needs_pip">Needs performance plan</option>
                <option value="not_ready">Not ready</option>
              </>
            ) : (
              <>
                <option value="pass">Pass</option>
                <option value="needs_support">Needs support</option>
                <option value="fail">Fail</option>
              </>
            )}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
