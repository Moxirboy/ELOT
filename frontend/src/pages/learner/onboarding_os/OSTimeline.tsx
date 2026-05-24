import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Compass,
  Cpu,
  HandHelping,
  HardHat,
  Hourglass,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import {
  Learner,
  OnboardingOS,
  type OnbEmployeeTimeline,
  type OnbTaskShape,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea, Input, Select } from "@/components/ui/Input";
import { cn, formatDate, formatDateTime, riskColor } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  preboarding: "Pre-boarding",
  day_1: "Day 1",
  week_1: "Week 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  extended: "Extended",
};
const STATUS_TONE: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-sky-100 text-sky-700 border-sky-200",
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  needs_improvement: "bg-rose-100 text-rose-700 border-rose-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
};

export function OSTimeline() {
  const learner = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: Learner.dashboard,
  });
  const employeeId = learner.data?.employee_id;

  const timeline = useQuery({
    queryKey: ["os-timeline", employeeId],
    queryFn: () => OnboardingOS.employeeTimeline(employeeId!),
    enabled: !!employeeId,
  });

  const qc = useQueryClient();
  const [submitTask, setSubmitTask] = useState<OnbTaskShape | null>(null);
  const [mentorOpen, setMentorOpen] = useState(false);

  const submit = useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: number;
      body: Parameters<typeof OnboardingOS.submitTask>[1];
    }) => OnboardingOS.submitTask(taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-timeline", employeeId] });
      setSubmitTask(null);
    },
  });

  if (!learner.data || learner.isLoading) {
    return <div className="text-slate-500">Loading…</div>;
  }
  if (!employeeId) {
    return (
      <Empty
        title="No onboarding for you"
        description="You don't have a learner profile linked yet."
      />
    );
  }
  if (timeline.isLoading) {
    return <div className="text-slate-500">Loading your onboarding…</div>;
  }
  if (!timeline.data) {
    return (
      <Empty
        icon={<Compass className="h-5 w-5" />}
        title="No onboarding instance yet"
        description="Ask HR to start your onboarding from the Onboarding OS dashboard."
      />
    );
  }

  const t = timeline.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-brand-600">
                Onboarding · {STAGE_LABEL[t.current_stage]}
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Welcome, {t.employee_name.split(" ")[0]}
              </h1>
              <p className="text-sm text-slate-500">
                {t.instance.role_name} · {t.instance.department} · started{" "}
                {formatDate(t.instance.start_date)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setMentorOpen(true)}>
              <Bot className="h-4 w-4" /> Ask AI mentor
            </Button>
          </div>
          <ProgressBar value={t.instance.overall_progress} />
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <PersonChip label="Manager" name={t.manager_name} />
            <PersonChip label="Supervisor" name={t.supervisor_name} />
            <PersonChip label="Buddy" name={t.buddy_name} />
          </div>
        </CardContent>
      </Card>

      {t.overdue_tasks.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="space-y-2 p-4">
            <div className="text-xs font-semibold uppercase text-rose-700">
              <AlertOctagon className="mr-1 inline h-3.5 w-3.5" /> Overdue
            </div>
            <ul className="space-y-1.5">
              {t.overdue_tasks.map((task) => (
                <li key={task.id} className="text-sm text-rose-800">
                  · {task.title} (due {formatDate(task.due_date)})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <OnboardingTeamPanel timeline={t} />
      <ITSetupPanel timeline={t} />

      {t.next_tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="mr-2 inline h-4 w-4 text-brand-600" /> What's
              next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2">
              {t.next_tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      Assigned by <strong>{task.assigned_by_role.toUpperCase()}</strong>{" "}
                      · reviewer <strong>{task.reviewer_name ?? task.reviewer_role}</strong>{" "}
                      · due {task.due_date ? formatDate(task.due_date) : "—"}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setSubmitTask(task)}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {t.stages.map((s) => (
        <Card key={s.stage}>
          <CardHeader>
            <CardTitle>{s.label}</CardTitle>
            <Badge>
              {s.completed} / {s.total} done
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {s.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpen={() => setSubmitTask(task)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {submitTask && (
        <TaskSubmitModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSubmit={(body) =>
            submit.mutate({ taskId: submitTask.id, body })
          }
          loading={submit.isPending}
        />
      )}

      {mentorOpen && (
        <MentorModal
          instanceId={t.instance.id}
          onClose={() => setMentorOpen(false)}
        />
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Your progress</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function PersonChip({ label, name }: { label: string; name: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700">
      <span className="font-semibold">{label}:</span>{" "}
      {name ?? <span className="text-slate-400">unassigned</span>}
    </span>
  );
}

function TaskCard({
  task,
  onOpen,
}: {
  task: OnbTaskShape;
  onOpen: () => void;
}) {
  const tone =
    STATUS_TONE[task.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const done = task.status === "approved" || task.status === "completed";
  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : task.status === "needs_improvement" ? (
              <XCircle className="h-4 w-4 text-rose-500" />
            ) : task.status === "submitted" ? (
              <Hourglass className="h-4 w-4 text-amber-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-900">
              {task.title}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Assigned by <strong>{task.assigned_by_role.toUpperCase()}</strong> ·
            reviewer{" "}
            <strong>
              {task.reviewer_name ?? task.reviewer_role.toUpperCase()}
            </strong>{" "}
            · due {task.due_date ? formatDate(task.due_date) : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs capitalize",
              tone,
            )}
          >
            {task.status.replace("_", " ")}
          </span>
          {typeof task.score === "number" && (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${riskColor(
                task.score >= 80 ? "low" : task.score >= 60 ? "medium" : "high",
              )}`}
            >
              {task.score}
            </span>
          )}
          {!done && (
            <Button size="sm" variant="outline" onClick={onOpen}>
              Open
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function TaskSubmitModal({
  task,
  onClose,
  onSubmit,
  loading,
}: {
  task: OnbTaskShape;
  onClose: () => void;
  onSubmit: (body: {
    submission_text?: string;
    attachment_url?: string;
    quiz_answers?: Record<string, string>;
  }) => void;
  loading: boolean;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                submission_text: text,
                attachment_url: attachment,
                quiz_answers: Object.keys(quizAnswers).length
                  ? quizAnswers
                  : undefined,
              })
            }
            loading={loading}
          >
            <Upload className="h-4 w-4" /> Submit
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Assigned by {task.assigned_by_role.toUpperCase()}
          </div>
          <p className="mt-1 text-slate-700">{task.description}</p>
        </div>
        {task.quiz_json && task.quiz_json.length > 0 ? (
          <div className="space-y-3">
            {task.quiz_json.map((q, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-3">
                <div className="font-medium">
                  {i + 1}. {q.question}
                </div>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o) => {
                    const key = q.question;
                    const selected = quizAnswers[key] === o;
                    return (
                      <li key={o}>
                        <button
                          onClick={() =>
                            setQuizAnswers({ ...quizAnswers, [key]: o })
                          }
                          className={cn(
                            "w-full rounded-lg border px-2 py-1 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                            selected
                              ? "border-brand-400 bg-brand-50 text-brand-700"
                              : "border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {o}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Field
              label="Your response"
              description="Explain what you did or paste a link."
            >
              <Textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            <Field label="Attachment URL (optional)">
              <Input
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
                placeholder="https://github.com/your-org/repo/pull/123"
              />
            </Field>
          </>
        )}
        {task.approval_required && (
          <div className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
            Approval required — your reviewer (
            <strong>{task.reviewer_name ?? task.reviewer_role}</strong>) will
            sign off before this counts as complete.
          </div>
        )}
      </div>
    </Modal>
  );
}

function MentorModal({
  instanceId,
  onClose,
}: {
  instanceId: number;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<
    { role: "you" | "ai"; text: string; sources?: string[] }[]
  >([]);
  const ask = useMutation({
    mutationFn: () => OnboardingOS.askMentor(instanceId, q),
    onMutate: () => {
      setThread((t) => [...t, { role: "you", text: q }]);
    },
    onSuccess: (r) => {
      setThread((t) => [...t, { role: "ai", text: r.answer, sources: r.sources }]);
      setQ("");
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="AI onboarding mentor"
      description="Ask about your timeline, your manager / supervisor / buddy, or company workflows."
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex h-[24rem] flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {thread.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              <MessageCircle className="mx-auto mb-2 h-4 w-4" />
              Try: "Who is my supervisor?" · "What's next this week?" · "How
              does our Git workflow work?"
            </div>
          )}
          {thread.map((m, i) =>
            m.role === "you" ? (
              <div
                key={i}
                className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3 py-1.5 text-sm text-white"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="max-w-[90%] rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                <div className="mb-1 text-xs font-semibold uppercase text-brand-600">
                  <Bot className="mr-1 inline h-3 w-3" /> Mentor
                </div>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Sources: {m.sources.join(", ")}
                  </div>
                )}
              </div>
            ),
          )}
          {ask.isPending && (
            <div className="text-sm text-slate-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />{" "}
              Thinking…
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a question…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) ask.mutate();
            }}
          />
          <Button onClick={() => ask.mutate()} disabled={!q.trim()} loading={ask.isPending}>
            Ask
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Team + IT panels + request-help button (PART 5 — Buddy/IT visibility on
// the employee timeline)
// ---------------------------------------------------------------------------
function OnboardingTeamPanel({ timeline }: { timeline: OnbEmployeeTimeline }) {
  const setup = useQuery({
    queryKey: ["it-setup-self", timeline.instance.employee_id],
    queryFn: () => OnboardingOS.itEmployeeSetup(timeline.instance.employee_id),
  });
  const itOwnerName =
    setup.data?.items.find((i) => i.reviewer_name)?.reviewer_name ?? null;

  const team: {
    role: string;
    name: string | null;
    icon: typeof Briefcase;
    tone: string;
  }[] = [
    {
      role: "Manager",
      name: timeline.manager_name,
      icon: Briefcase,
      tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      role: "Supervisor",
      name: timeline.supervisor_name,
      icon: HardHat,
      tone: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      role: "Buddy",
      name: timeline.buddy_name,
      icon: HandHelping,
      tone: "bg-pink-50 text-pink-700 border-pink-100",
    },
    {
      role: "IT owner",
      name: itOwnerName,
      icon: Cpu,
      tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your onboarding team</CardTitle>
        <HelpButton instanceId={timeline.instance.id} />
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 md:grid-cols-2">
          {team.map((p) => (
            <li
              key={p.role}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-sm",
                p.tone,
              )}
            >
              <div className="flex items-center gap-3">
                <p.icon className="h-4 w-4" />
                <div>
                  <div className="text-[11px] uppercase tracking-wide opacity-70">
                    {p.role}
                  </div>
                  <div className="font-medium">
                    {p.name ?? (
                      <span className="opacity-60">unassigned</span>
                    )}
                  </div>
                </div>
              </div>
              {p.name && (
                <span className="text-[11px] opacity-70">Visible to you</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ITSetupPanel({ timeline }: { timeline: OnbEmployeeTimeline }) {
  const setup = useQuery({
    queryKey: ["it-setup-self", timeline.instance.employee_id],
    queryFn: () => OnboardingOS.itEmployeeSetup(timeline.instance.employee_id),
  });
  if (setup.isLoading) return null;
  const items = setup.data?.items ?? [];
  if (items.length === 0) return null;
  const completionPct = Math.round((setup.data?.completion_rate ?? 0) * 100);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Cpu className="mr-2 inline h-4 w-4 text-cyan-600" /> IT setup
          checklist
        </CardTitle>
        <Badge tone={completionPct === 100 ? "success" : "brand"}>
          {completionPct}%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <ul className="space-y-1.5 text-sm">
          {items.map((i) => {
            const done = i.status === "completed" || i.status === "approved";
            const blocked = i.status === "blocked";
            return (
              <li
                key={i.task_id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-2"
              >
                <div>
                  <div className="font-medium text-slate-900">{i.title}</div>
                  <div className="text-xs text-slate-500">
                    {done
                      ? "Done"
                      : blocked
                        ? "Blocked"
                        : i.due_date
                          ? `Due ${formatDate(i.due_date)}`
                          : "In progress"}
                    {blocked && i.blocker_reason && (
                      <>
                        {" — "}
                        <span className="text-rose-700">{i.blocker_reason}</span>
                      </>
                    )}
                    {i.asset_id && <> · Asset {i.asset_id}</>}
                  </div>
                </div>
                <Badge
                  tone={done ? "success" : blocked ? "danger" : "warning"}
                  className="capitalize"
                >
                  {i.status.replace("_", " ")}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function HelpButton({ instanceId }: { instanceId: number }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    target_role: "buddy" as "buddy" | "hr" | "manager" | "it",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
  });
  const qc = useQueryClient();
  const send = useMutation({
    mutationFn: () =>
      OnboardingOS.createHelpRequest(instanceId, {
        target_role: form.target_role,
        message: form.message,
        priority: form.priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-timeline"] });
      setOpen(false);
      setForm({ ...form, message: "" });
    },
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <HandHelping className="h-4 w-4" /> Request help
      </Button>
      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Request help"
          description="Reach the right person on your onboarding team."
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => send.mutate()}
                loading={send.isPending}
                disabled={!form.message.trim()}
              >
                Send
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <Field label="Who can help most?">
              <Select
                value={form.target_role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    target_role: e.target.value as typeof form.target_role,
                  })
                }
              >
                <option value="buddy">Buddy</option>
                <option value="manager">Manager</option>
                <option value="it">IT</option>
                <option value="hr">HR</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as typeof form.priority,
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
            <Field label="What do you need?">
              <Textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Quick sync on deploy pipeline before tomorrow's hotfix?"
              />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
