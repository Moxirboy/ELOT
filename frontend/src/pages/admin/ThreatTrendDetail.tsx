import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  Lightbulb,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  PhishingTests,
  Threats,
  type GeneratedTraining,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDateTime, riskColor } from "@/lib/utils";

export function ThreatTrendDetail() {
  const { id } = useParams();
  const trendId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewed, setReviewed] = useState({
    lesson: false,
    scenario: false,
    quiz: false,
    limitations: false,
  });

  const trend = useQuery({
    queryKey: ["threat-trend", trendId],
    queryFn: () => Threats.trend(trendId),
    enabled: !Number.isNaN(trendId),
  });
  const trainings = useQuery({
    queryKey: ["threat-trainings"],
    queryFn: Threats.trainings,
  });

  const myTraining = trainings.data?.find((t) => t.trend_id === trendId) ?? null;

  const generate = useMutation({
    mutationFn: () => Threats.generateTraining(trendId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-trainings"] }),
  });

  const approve = useMutation({
    mutationFn: (tid: number) => Threats.approve(tid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-trainings"] }),
  });

  const publish = useMutation({
    mutationFn: (tid: number) => Threats.publish(tid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-trainings"] }),
  });

  const createTest = useMutation({
    mutationFn: (training: GeneratedTraining) =>
      PhishingTests.create({
        training_id: training.id,
        title: `${training.title} — challenge`,
        test_type: "in_app",
      }),
    onSuccess: (test) => {
      qc.invalidateQueries({ queryKey: ["phishing-tests"] });
      navigate(`/admin/phishing-tests`);
    },
  });

  if (trend.isLoading || !trend.data) {
    return (
      <div className="text-slate-500">
        <Link
          to="/admin/threat-intelligence"
          className="inline-flex items-center gap-1 text-sm hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to threats
        </Link>
        <div className="mt-4">Loading trend…</div>
      </div>
    );
  }

  const t = trend.data;
  const allReviewed = Object.values(reviewed).every(Boolean);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/threat-intelligence"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to threats
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-rose-500 px-6 py-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 font-semibold uppercase tracking-wide">
              {t.method}
            </span>
            <span
              className={`rounded-full border border-white/30 bg-white/15 px-2 py-1 capitalize`}
            >
              {t.risk_level} risk
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold md:text-3xl">{t.title}</h1>
          <div className="mt-2 text-sm text-white/85">{t.channel}</div>
        </div>
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <SectionTitle icon={<ShieldAlert className="h-4 w-4" />}>
              Red flags
            </SectionTitle>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {t.red_flags_json.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle icon={<ShieldCheck className="h-4 w-4" />}>
              Safe response
            </SectionTitle>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {t.safe_response_json.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2 text-xs">
            <span className="text-slate-500">Target roles:</span>
            {t.target_roles_json.map((r) => (
              <span
                key={r}
                className={`rounded-full border px-2 py-0.5 capitalize ${riskColor(
                  t.risk_level,
                )}`}
              >
                {r}
              </span>
            ))}
          </div>
          {t.ai_summary_json?.training_recommendation && (
            <div className="md:col-span-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
              <Lightbulb className="mr-1 inline h-4 w-4" />
              <strong>Recommendation:</strong>{" "}
              {t.ai_summary_json.training_recommendation}
            </div>
          )}
          <div className="md:col-span-2 text-xs text-slate-400">
            Ingested {formatDateTime(t.created_at)}
          </div>
        </CardContent>
      </Card>

      {/* AI training generator */}
      {!myTraining ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="mr-2 inline h-4 w-4 text-brand-600" />
              Generate safe security training
            </CardTitle>
            <Badge tone="brand">AI-assisted</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Build a 3-minute employee training from this trend. The AI is
              instructed never to include real malicious URLs, never to copy
              real brand logins, and to always include limitations. The output
              is created as a <strong>draft</strong> and must be reviewed before
              it can be published.
            </p>
            <Button
              size="lg"
              onClick={() => generate.mutate()}
              loading={generate.isPending}
            >
              <Sparkles className="h-5 w-5" /> Generate training draft
            </Button>
            {generate.error && (
              <p className="text-sm text-rose-600">
                {(generate.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <TrainingReviewCard
          training={myTraining}
          reviewed={reviewed}
          setReviewed={setReviewed}
          allReviewed={allReviewed}
          onApprove={() => approve.mutate(myTraining.id)}
          onPublish={() => publish.mutate(myTraining.id)}
          onCreateTest={() => createTest.mutate(myTraining)}
          publishing={publish.isPending}
          approving={approve.isPending}
          creatingTest={createTest.isPending}
        />
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {icon} {children}
    </div>
  );
}

function TrainingReviewCard({
  training,
  reviewed,
  setReviewed,
  allReviewed,
  onApprove,
  onPublish,
  onCreateTest,
  publishing,
  approving,
  creatingTest,
}: {
  training: GeneratedTraining;
  reviewed: { lesson: boolean; scenario: boolean; quiz: boolean; limitations: boolean };
  setReviewed: (r: typeof reviewed) => void;
  allReviewed: boolean;
  onApprove: () => void;
  onPublish: () => void;
  onCreateTest: () => void;
  publishing: boolean;
  approving: boolean;
  creatingTest: boolean;
}) {
  const lesson = training.lesson_json;
  const scenario = training.scenario_json;
  const quiz = training.quiz_json ?? [];
  const statusTone =
    training.status === "published"
      ? "success"
      : training.status === "approved"
        ? "brand"
        : "warning";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{training.title}</CardTitle>
          <Badge tone={statusTone} className="capitalize">
            {training.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {lesson && (
            <div>
              <SectionTitle icon={<Eye className="h-4 w-4" />}>
                Lesson
              </SectionTitle>
              {lesson.summary && (
                <p className="mb-2 text-sm text-slate-500">{lesson.summary}</p>
              )}
              <p className="text-sm leading-relaxed text-slate-700">
                {lesson.lesson}
              </p>
              {lesson.redFlags?.length > 0 && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl bg-rose-50 p-3 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase text-rose-700">
                      Red flags
                    </div>
                    <ul className="space-y-1 text-slate-700">
                      {lesson.redFlags.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase text-emerald-700">
                      Safe actions
                    </div>
                    <ul className="space-y-1 text-slate-700">
                      {(lesson.safeActions ?? []).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {scenario && (
            <div>
              <SectionTitle icon={<ShieldAlert className="h-4 w-4" />}>
                Phishing scenario
              </SectionTitle>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="italic text-slate-700">"{scenario.message}"</p>
                <p className="mt-2 font-medium text-slate-900">
                  {scenario.question}
                </p>
                <ul className="mt-2 space-y-1 text-slate-700">
                  {scenario.options.map((o, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-md px-2 py-1",
                        o === scenario.correctAnswer
                          ? "bg-emerald-100 text-emerald-800 font-medium"
                          : "",
                      )}
                    >
                      • {o}
                      {o === scenario.correctAnswer && (
                        <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />
                      )}
                    </li>
                  ))}
                </ul>
                {scenario.explanation && (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong>Why:</strong> {scenario.explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          {quiz.length > 0 && (
            <div>
              <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />}>
                Knowledge check ({quiz.length})
              </SectionTitle>
              <ul className="space-y-2 text-sm">
                {quiz.map((q, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-slate-100 p-3"
                  >
                    <div className="font-medium text-slate-900">
                      {i + 1}. {q.question}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-slate-600">
                      {q.options.map((o, j) => (
                        <li
                          key={j}
                          className={
                            o === q.correctAnswer
                              ? "font-medium text-emerald-700"
                              : ""
                          }
                        >
                          • {o}
                          {o === q.correctAnswer ? "  ✓" : ""}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson?.limitations && lesson.limitations.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Limitations:</strong>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {lesson.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-600" />
            Reviewer checklist
          </CardTitle>
          <Badge tone={allReviewed ? "success" : "warning"}>
            {Object.values(reviewed).filter(Boolean).length}/4
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {(
            ["lesson", "scenario", "quiz", "limitations"] as Array<
              keyof typeof reviewed
            >
          ).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={reviewed[k]}
                onChange={(e) =>
                  setReviewed({ ...reviewed, [k]: e.target.checked })
                }
                className="mt-0.5"
              />
              <span className="text-sm capitalize text-slate-700">
                I reviewed the <strong>{k}</strong>
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {training.status === "draft" && (
              <Button
                onClick={onApprove}
                loading={approving}
                disabled={!allReviewed}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve training
              </Button>
            )}
            {training.status === "approved" && (
              <Button onClick={onPublish} loading={publishing}>
                <Rocket className="h-4 w-4" /> Publish to employees
              </Button>
            )}
            {training.status === "published" && (
              <Button onClick={onCreateTest} loading={creatingTest}>
                <ExternalLink className="h-4 w-4" /> Create phishing test
              </Button>
            )}
            {training.status === "draft" && !allReviewed && (
              <span className="self-center text-xs text-slate-500">
                All four checks must be ticked before approving.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
