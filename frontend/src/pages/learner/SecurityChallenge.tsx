import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FishSymbol,
  Flag,
  Mail,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  Learner,
  PhishingTests,
  type PhishingTestResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, riskColor } from "@/lib/utils";

export function SecurityChallenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const testId = Number(id);

  const test = useQuery({
    queryKey: ["phishing-test", testId],
    queryFn: () => PhishingTests.get(testId),
    enabled: !Number.isNaN(testId),
  });
  const learner = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: Learner.dashboard,
  });

  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<PhishingTestResult | null>(null);
  const [startedAt] = useState<number>(() => Date.now());

  const submit = useMutation({
    mutationFn: (vars: {
      answer: string;
      action?: "reported";
    }) =>
      PhishingTests.submitAnswer(testId, {
        employee_id: learner.data?.employee_id ?? user?.id ?? 0,
        answer: vars.answer,
        action: vars.action,
        elapsed_ms: Date.now() - startedAt,
      }),
    onSuccess: (res) => setSubmitted(res),
  });

  const scenario = test.data?.scenario_json;
  const correct = scenario?.correctAnswer ?? "";

  // Shuffle options stably per test id so the correct answer isn't always #3.
  const options = useMemo(() => {
    if (!scenario?.options) return [];
    const seeded = scenario.options.map((o, i) => ({ o, k: (i * 9301 + testId * 49297) % 233280 }));
    return seeded.sort((a, b) => a.k - b.k).map((x) => x.o);
  }, [scenario, testId]);

  // Auto-record "opened" the first time a learner views the test.
  useEffect(() => {
    if (!learner.data?.employee_id || !test.data) return;
    if (submitted) return;
    // Skip — submit-answer below already records action when an answer is chosen.
  }, [learner.data, test.data, submitted]);

  if (test.isLoading || !test.data) {
    return <div className="text-slate-500">Loading challenge…</div>;
  }
  if (!scenario) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">
          This challenge does not have a scenario configured.
        </p>
      </Card>
    );
  }

  const isCorrect = submitted?.action === "answered_correctly";
  const isRisky = submitted?.action === "answered_risky";

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/learner/dashboard")}
        className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-rose-600 via-fuchsia-600 to-brand-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 font-semibold uppercase tracking-wide">
              <FishSymbol className="h-3.5 w-3.5" /> Security challenge
            </span>
            <span className="rounded-full border border-white/30 bg-white/15 px-2 py-1">
              In-app · safe
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold">{test.data.title}</h1>
          <p className="mt-1 text-sm text-white/85">
            Read the simulated message below and pick the safest response. No real
            URLs or credentials are involved.
          </p>
        </div>

        <CardContent className="space-y-5 p-6">
          {/* Simulated inbox view */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-amber-400 text-sm font-bold text-white">
                ?
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Unknown sender · ELOT simulated message
                  </span>
                  <span className="text-slate-400">just now</span>
                </div>
                <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-800">
                  <Mail className="mr-2 inline h-4 w-4 text-slate-400" />
                  {scenario.message}
                </div>
              </div>
            </div>
          </div>

          {!submitted && (
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900">
                {scenario.question}
              </div>
              <ul className="space-y-2">
                {options.map((o) => (
                  <li key={o}>
                    <button
                      onClick={() => setPicked(o)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                        picked === o
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      )}
                      aria-pressed={picked === o}
                    >
                      {o}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    submit.mutate({
                      answer: "(reported as suspicious)",
                      action: "reported",
                    })
                  }
                  disabled={submit.isPending}
                >
                  <Flag className="h-4 w-4" /> Report as suspicious
                </Button>
                <Button
                  onClick={() => picked && submit.mutate({ answer: picked })}
                  disabled={!picked || submit.isPending}
                  loading={submit.isPending}
                >
                  <Sparkles className="h-4 w-4" /> Submit answer
                </Button>
              </div>
            </div>
          )}

          {submitted && (
            <div
              className={cn(
                "rounded-2xl border p-4",
                isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : isRisky
                    ? "border-rose-200 bg-rose-50"
                    : "border-amber-200 bg-amber-50",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-800">
                      Correct — that's the safe response.
                    </span>
                  </>
                ) : isRisky ? (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span className="text-rose-800">
                      Risky — this is exactly what attackers want.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-800">
                      Thanks — reporting is always a safe move.
                    </span>
                  </>
                )}
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(submitted.risk_level)}`}
                >
                  {submitted.risk_level} risk · score {submitted.score}
                </span>
              </div>
              {submitted.feedback_json?.explanation && (
                <p className="mt-2 text-sm text-slate-700">
                  {submitted.feedback_json.explanation}
                </p>
              )}
              {!isCorrect && correct && (
                <p className="mt-2 text-sm text-slate-700">
                  <strong>Safest answer:</strong> {correct}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => navigate("/learner/dashboard")}>
                  <ArrowLeft className="h-4 w-4" /> Back to dashboard
                </Button>
                {!isCorrect && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPicked(null);
                      setSubmitted(null);
                    }}
                  >
                    Try again
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
            This is a safe in-app simulation. No real URLs, brands, or credentials
            are used. Your score is shared with your admin for training analytics
            only.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
