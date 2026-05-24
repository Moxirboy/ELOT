import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  HandHelping,
  Heart,
  Sparkles,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Empty } from "@/components/ui/Empty";
import { formatDateTime, riskColor } from "@/lib/utils";

const VISIBILITY_OPTIONS: { value: "hr_only" | "manager" | "supervisor" | "employee" | "all_owners"; label: string }[] = [
  { value: "hr_only", label: "Private to HR" },
  { value: "manager", label: "HR + manager" },
  { value: "employee", label: "Visible to employee" },
  { value: "all_owners", label: "All onboarding owners" },
];

export function BuddyNewHireDetail() {
  const { id } = useParams();
  const instanceId = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();

  const inst = useQuery({
    queryKey: ["os-instance", instanceId],
    queryFn: () => OnboardingOS.getInstance(instanceId),
    enabled: !Number.isNaN(instanceId),
  });
  const reviews = useQuery({
    queryKey: ["os-reviews", instanceId],
    queryFn: () => OnboardingOS.listReviews(instanceId),
    enabled: !Number.isNaN(instanceId),
  });
  const help = useQuery({
    queryKey: ["help-for-inst", instanceId],
    queryFn: () =>
      OnboardingOS.listHelpRequests({
        instance_id: instanceId,
        target_role: "buddy",
      }),
    enabled: !Number.isNaN(instanceId),
  });
  const dash = useQuery({
    queryKey: ["buddy-dash", user?.employee_id],
    queryFn: () => OnboardingOS.buddyDashboard(user!.employee_id!),
    enabled: !!user?.employee_id,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    culture_score: 4,
    connection_score: 4,
    comment: "",
    visibility: "all_owners" as const,
  });

  const addCheckin = useMutation({
    mutationFn: () =>
      OnboardingOS.addBuddyCheckin(instanceId, {
        culture_score: form.culture_score,
        connection_score: form.connection_score,
        comment: form.comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buddy-dash", user?.employee_id] });
      setOpen(false);
      setForm({
        culture_score: 4,
        connection_score: 4,
        comment: "",
        visibility: "all_owners",
      });
    },
  });

  const respond = useMutation({
    mutationFn: ({ helpId, text }: { helpId: number; text: string }) =>
      OnboardingOS.respondHelpRequest(helpId, {
        response_text: text,
        close: false,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["help-for-inst", instanceId] }),
  });

  if (inst.isLoading || !inst.data) {
    return <div className="text-slate-500">Loading…</div>;
  }

  const c = inst.data;
  const lastCheckin = dash.data?.recent_checkins.find(
    (x) => x.instance_id === instanceId,
  );

  return (
    <div className="space-y-6">
      <Link
        to="/buddy/new-hires"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to new hires
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {c.employee_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {c.role_name} · {c.department} · stage {c.current_stage}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(c.risk_level)}`}
              >
                {c.risk_level} risk
              </span>
              <Button onClick={() => setOpen(true)}>
                <Sparkles className="h-4 w-4" /> Log check-in
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <div className="text-slate-400 uppercase tracking-wide">
                Manager
              </div>
              <div className="text-slate-800">
                {c.manager_name ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-400 uppercase tracking-wide">
                Supervisor
              </div>
              <div className="text-slate-800">
                {c.supervisor_name ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-400 uppercase tracking-wide">
                Last check-in (yours)
              </div>
              <div className="text-slate-800">
                {lastCheckin ? formatDateTime(lastCheckin.created_at) : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
              Manager reviews
            </CardTitle>
            <Badge>{reviews.data?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {!reviews.data || reviews.data.length === 0 ? (
              <p className="text-sm text-slate-500">
                No formal reviews logged yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {reviews.data.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">
                        {r.review_type.replace("_", "-")}
                      </span>
                      <span>{formatDateTime(r.created_at)}</span>
                    </div>
                    {r.strengths && (
                      <p className="mt-1 text-emerald-700">{r.strengths}</p>
                    )}
                    {r.weaknesses && (
                      <p className="mt-1 text-rose-700">{r.weaknesses}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <HandHelping className="mr-2 inline h-4 w-4 text-pink-500" /> Help
              requests they sent you
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!help.data || help.data.length === 0 ? (
              <Empty
                title="No help requests yet"
                description="They haven't pinged you for help on anything."
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {help.data.map((h) => (
                  <li
                    key={h.id}
                    className="space-y-2 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {formatDateTime(h.created_at)} ·{" "}
                        <span className="capitalize">{h.priority}</span>{" "}
                        priority
                      </span>
                      <Badge
                        tone={
                          h.status === "open"
                            ? "warning"
                            : h.status === "responded"
                              ? "brand"
                              : "success"
                        }
                      >
                        {h.status}
                      </Badge>
                    </div>
                    <p className="text-slate-800">{h.message}</p>
                    {h.response_text ? (
                      <div className="rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800">
                        <strong>Your reply:</strong> {h.response_text}
                      </div>
                    ) : (
                      <InlineReply
                        onSubmit={(text) =>
                          respond.mutate({ helpId: h.id, text })
                        }
                        loading={respond.isPending}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-pink-50/40">
        <CardContent className="space-y-2 p-4 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-pink-700">
            <Heart className="h-4 w-4" /> What buddies notice first
          </div>
          <ul className="ml-6 list-disc space-y-1 text-slate-600">
            <li>Energy in standups + 1:1s</li>
            <li>Whether they ask for help early or stay stuck</li>
            <li>Team-fit signals — joining lunches, contributing in chat</li>
            <li>Tool/access friction that managers can't see</li>
          </ul>
          <p className="text-xs text-slate-500">
            Log what you notice — even 2 sentences a week is enough to flag
            risk before the manager review.
          </p>
        </CardContent>
      </Card>

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={`Log a check-in for ${c.employee_name}`}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addCheckin.mutate()}
                loading={addCheckin.isPending}
                disabled={!form.comment.trim()}
              >
                <Sparkles className="h-4 w-4" /> Save check-in
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Culture fit">
                <Select
                  value={form.culture_score}
                  onChange={(e) =>
                    setForm({ ...form, culture_score: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Team connection">
                <Select
                  value={form.connection_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      connection_score: Number(e.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Comment"
              description="What's going well? What needs help?"
            >
              <Textarea
                rows={5}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Settling in well — paired on standup yesterday and asked great questions. One worry: still uncertain about deploy pipeline."
              />
            </Field>
            <Field label="Visibility">
              <Select
                value={form.visibility}
                onChange={(e) =>
                  setForm({
                    ...form,
                    visibility: e.target
                      .value as typeof form.visibility,
                  })
                }
              >
                {VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="rounded-xl bg-slate-100 p-2 text-xs text-slate-600">
              Buddy check-ins never count toward formal review scores.
            </p>
          </div>
        </Modal>
      )}

      {dash.data && dash.data.at_risk_hires > 0 && (
        <Card className="border-rose-200 bg-rose-50/40 p-4 text-sm text-rose-700">
          <AlertOctagon className="mr-1 inline h-4 w-4" />
          One or more of your paired hires is at <strong>medium / high</strong>
          {" "}risk — schedule a check-in this week.
        </Card>
      )}
    </div>
  );
}

function InlineReply({
  onSubmit,
  loading,
}: {
  onSubmit: (text: string) => void;
  loading: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Quick reply…"
        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (text.trim()) onSubmit(text);
        }}
        loading={loading}
        disabled={!text.trim()}
      >
        Reply
      </Button>
    </div>
  );
}
