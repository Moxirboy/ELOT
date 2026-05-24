import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Hand,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { formatDate, formatDateTime, riskColor } from "@/lib/utils";

export function BuddyDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const employeeId = user?.employee_id;

  const dash = useQuery({
    queryKey: ["buddy-dash", employeeId],
    queryFn: () => OnboardingOS.buddyDashboard(employeeId!),
    enabled: !!employeeId,
  });

  const [checkInOn, setCheckInOn] = useState<number | null>(null);
  const [form, setForm] = useState({ culture_score: 4, connection_score: 4, comment: "" });

  const addCheckin = useMutation({
    mutationFn: () =>
      OnboardingOS.addBuddyCheckin(checkInOn!, {
        culture_score: form.culture_score,
        connection_score: form.connection_score,
        comment: form.comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buddy-dash", employeeId] });
      setCheckInOn(null);
      setForm({ culture_score: 4, connection_score: 4, comment: "" });
    },
  });

  if (!employeeId) {
    return (
      <Empty
        title="You're not linked to an employee record"
        description="Ask HR to link your account to an Employee row to use the buddy dashboard."
      />
    );
  }
  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data)
    return (
      <Empty
        icon={<Hand className="h-5 w-5" />}
        title="Could not load your check-ins"
        description="Backend may be unreachable."
      />
    );

  const d = dash.data;
  const lastByInst = (d.last_checkin_by_instance ?? {}) as Record<
    string,
    string | null
  >;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Hand className="mr-2 inline h-6 w-6 text-pink-500" /> Buddy mode —{" "}
          {d.buddy_name}
        </h1>
        <p className="text-sm text-slate-500">
          New hires you're paired with, plus your recent informal check-ins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">New hires</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {d.new_hires.length}
          </div>
          <div className="text-xs text-slate-500">paired with you</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">Check-ins logged</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {d.recent_checkins.length}
          </div>
          <div className="text-xs text-slate-500">most recent shown below</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">
            <Heart className="mr-1 inline h-3.5 w-3.5 text-rose-500" /> Why this
            matters
          </div>
          <div className="mt-1 text-sm text-slate-700">
            Buddies catch culture-fit and ramp-up risks weeks before manager
            reviews. Your input is private to HR and the new hire's owner chain.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your paired new hires</CardTitle>
          <Badge>{d.new_hires.length}</Badge>
        </CardHeader>
        <CardContent>
          {d.new_hires.length === 0 ? (
            <Empty
              title="No one paired with you yet"
              description="HR hasn't assigned you as a buddy on any active onboarding."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {d.new_hires.map((c) => {
                const last = lastByInst[String(c.id)];
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-slate-100 p-4"
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
                        {c.current_stage.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Last check-in:{" "}
                      {last ? (
                        <span className="text-slate-700">{formatDateTime(last)}</span>
                      ) : (
                        <span className="text-rose-600">none yet</span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setCheckInOn(c.id)}
                      >
                        <Sparkles className="h-4 w-4" /> Log check-in
                      </Button>
                      <Link to={`/admin/onboarding-os/instances/${c.id}`}>
                        <Button size="sm" variant="outline">
                          View instance <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <MessageCircle className="mr-2 inline h-4 w-4" /> Recent check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.recent_checkins.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing logged yet — click <strong>Log check-in</strong> on a
              new hire above to start.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {d.recent_checkins.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Instance #{c.instance_id} ·{" "}
                      {formatDateTime(c.created_at)}
                    </span>
                    <span>
                      culture {c.culture_score}/5 · connection{" "}
                      {c.connection_score}/5
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800">{c.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {checkInOn && (
        <Modal
          open
          onClose={() => setCheckInOn(null)}
          title="Log a buddy check-in"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setCheckInOn(null)}>
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
                rows={4}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="They're contributing in standups and asking great questions; one stuck point on the deploy pipeline."
              />
            </Field>
            <p className="rounded-xl bg-slate-100 p-2 text-xs text-slate-600">
              Visible to HR + the manager + the new hire's owner chain. Buddy
              check-ins never count toward formal review scores.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
