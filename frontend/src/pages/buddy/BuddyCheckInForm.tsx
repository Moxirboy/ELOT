import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";

export function BuddyCheckInForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const employeeId = user?.employee_id;

  const dash = useQuery({
    queryKey: ["buddy-dash", employeeId],
    queryFn: () => OnboardingOS.buddyDashboard(employeeId!),
    enabled: !!employeeId,
  });

  const [form, setForm] = useState({
    instance_id: 0,
    culture_score: 4,
    connection_score: 4,
    confidence_score: 4,
    communication_score: 4,
    blockers: "",
    comment: "",
    recommendation: "",
    visibility: "all_owners" as
      | "hr_only"
      | "manager"
      | "supervisor"
      | "employee"
      | "all_owners",
  });

  const submit = useMutation({
    mutationFn: () =>
      OnboardingOS.addBuddyCheckin(form.instance_id, {
        culture_score: form.culture_score,
        connection_score: form.connection_score,
        // Pack the rest into comment because the backend's BuddyCheckIn
        // model has two scores + a comment. Recommendation + blockers ride
        // along in the comment with clear prefixes.
        comment: [
          form.comment,
          form.blockers && `Blockers noticed: ${form.blockers}`,
          form.recommendation && `Recommended support: ${form.recommendation}`,
          `Visibility: ${form.visibility.replace("_", " ")}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buddy-dash", employeeId] });
      navigate("/buddy/check-ins");
    },
  });

  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data || dash.data.new_hires.length === 0) {
    return (
      <Empty
        title="No-one paired with you yet"
        description="You'll be able to log check-ins once HR assigns you as a buddy."
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Heart className="mr-2 inline h-6 w-6 text-pink-500" /> New buddy
          check-in
        </h1>
        <p className="text-sm text-slate-500">
          Two minutes is enough — be honest, be helpful.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>Tell us what you noticed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="New hire" required>
              <Select
                value={form.instance_id || ""}
                onChange={(e) =>
                  setForm({ ...form, instance_id: Number(e.target.value) || 0 })
                }
              >
                <option value="">Pick someone…</option>
                {dash.data.new_hires.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.employee_name} — {h.role_name}
                  </option>
                ))}
              </Select>
            </Field>

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
              <Field label="Confidence">
                <Select
                  value={form.confidence_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      confidence_score: Number(e.target.value),
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
              <Field label="Communication">
                <Select
                  value={form.communication_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      communication_score: Number(e.target.value),
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

            <Field label="Blockers you noticed">
              <Textarea
                rows={2}
                value={form.blockers}
                onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                placeholder="Deploy access still patchy, struggling with the CRM ticket flow…"
              />
            </Field>

            <Field
              label="Feedback comment"
              description="What's going well + what you'd raise to HR / the manager."
              required
            >
              <Textarea
                rows={5}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Joining standups, asking great questions; one worry is uncertainty about deploy pipeline."
              />
            </Field>

            <Field label="Recommended support">
              <Textarea
                rows={2}
                value={form.recommendation}
                onChange={(e) =>
                  setForm({ ...form, recommendation: e.target.value })
                }
                placeholder="Pair on a deploy with senior teammate this Friday."
              />
            </Field>

            <Field label="Visibility">
              <Select
                value={form.visibility}
                onChange={(e) =>
                  setForm({
                    ...form,
                    visibility: e.target.value as typeof form.visibility,
                  })
                }
              >
                <option value="hr_only">Private to HR</option>
                <option value="manager">HR + manager</option>
                <option value="employee">Visible to employee</option>
                <option value="all_owners">All onboarding owners</option>
              </Select>
            </Field>

            <Button
              size="lg"
              className="w-full"
              loading={submit.isPending}
              onClick={() => submit.mutate()}
              disabled={!form.instance_id || !form.comment.trim()}
            >
              <Sparkles className="h-5 w-5" /> Submit check-in
            </Button>
            {submit.error && (
              <p className="text-sm text-rose-600">
                {(submit.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-pink-50/40">
          <CardContent className="space-y-2 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-pink-700">
              <Heart className="h-4 w-4" /> Why this matters
            </div>
            <p>
              Buddies catch culture-fit and ramp-up risks weeks before the
              manager review. A 2-minute note now can save a 2-week recovery
              later.
            </p>
            <ul className="ml-5 list-disc space-y-1 text-xs text-slate-600">
              <li>Visible to HR + the assigned owner chain by default</li>
              <li>Never counts toward formal review scores</li>
              <li>Can be marked "private to HR" if sensitive</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
