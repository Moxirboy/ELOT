import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Onboarding } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Badge } from "@/components/ui/Badge";
import { LessonAudio } from "@/components/learning/LessonAudio";
import { cn, prettyStatus } from "@/lib/utils";

export function OnboardingModule() {
  const { moduleIndex } = useParams();
  const idx = Number(moduleIndex);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const plan = useQuery({
    queryKey: ["my-onboarding"],
    queryFn: Onboarding.mine,
    retry: false,
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = useMutation({
    mutationFn: ({ score, status }: { score: number; status: "completed" }) =>
      Onboarding.updateModule(plan.data!.employee_id, {
        module_index: idx,
        score,
        status,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-onboarding"] }),
  });

  const module = plan.data?.modules_json[idx];

  const score = useMemo(() => {
    if (!module) return 0;
    const total = module.quiz.length;
    if (total === 0) return 100;
    let correct = 0;
    module.quiz.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct += 1;
    });
    return Math.round((correct / total) * 100);
  }, [module, answers]);

  if (plan.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!plan.data || !module) {
    return (
      <div className="space-y-3">
        <Link
          to="/learner/onboarding"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to onboarding
        </Link>
        <Empty title="Module not found" description="Try opening another module." />
      </div>
    );
  }

  const allAnswered = module.quiz.every((_, i) => !!answers[i]);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/learner/onboarding")}
        className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to onboarding
      </button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-brand-600 to-accent-600 px-6 py-6 text-white">
          <div className="text-xs uppercase tracking-wider opacity-90">
            <BookOpen className="mr-1 inline h-3.5 w-3.5" /> Module {idx + 1} ·{" "}
            {prettyStatus(module.type)}
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{module.title}</h1>
          <p className="mt-1 text-sm text-white/85">{module.description}</p>
        </div>
        <CardContent className="space-y-4 p-6">
          <LessonAudio text={module.lesson} />
          <p className="leading-relaxed text-slate-700">{module.lesson}</p>

          {module.quiz.length > 0 && (
            <div className="space-y-4">
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Knowledge check · {module.quiz.length} question(s)
                </div>
              </div>
              <ol className="space-y-4">
                {module.quiz.map((q, i) => {
                  const picked = answers[i];
                  const showFeedback = submitted;
                  return (
                    <li
                      key={i}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {i + 1}. {q.question}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((o) => {
                          const selected = picked === o;
                          const isCorrect = o === q.correctAnswer;
                          return (
                            <button
                              key={o}
                              disabled={submitted}
                              onClick={() =>
                                setAnswers((a) => ({ ...a, [i]: o }))
                              }
                              className={cn(
                                "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                                showFeedback
                                  ? isCorrect
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : selected
                                      ? "border-rose-300 bg-rose-50 text-rose-800"
                                      : "border-slate-200 bg-white text-slate-500"
                                  : selected
                                    ? "border-brand-400 bg-brand-50 text-brand-700"
                                    : "border-slate-200 bg-white hover:bg-slate-50",
                              )}
                              aria-pressed={selected}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                      {showFeedback && (
                        <div className="mt-2 text-xs">
                          <span
                            className={cn(
                              "font-semibold",
                              picked === q.correctAnswer
                                ? "text-emerald-700"
                                : "text-rose-700",
                            )}
                          >
                            {picked === q.correctAnswer ? (
                              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="mr-1 inline h-3.5 w-3.5" />
                            )}
                            {picked === q.correctAnswer ? "Correct" : "Not quite"}
                          </span>
                          {q.explanation && ` — ${q.explanation}`}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {!submitted ? (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!allAnswered}
                  onClick={() => setSubmitted(true)}
                >
                  <Sparkles className="h-5 w-5" /> Check answers
                </Button>
              ) : module.status === "completed" ? (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 p-4 text-center">
                  <Badge tone="success">Already completed</Badge>
                  <Button
                    className="mt-3"
                    onClick={() => navigate("/learner/onboarding")}
                  >
                    Back to onboarding <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Module score
                  </div>
                  <div className="text-4xl font-bold text-brand-700">{score}</div>
                  <Button
                    className="mt-3"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { score, status: "completed" },
                        {
                          onSuccess: () => navigate("/learner/onboarding"),
                        },
                      )
                    }
                  >
                    Mark module complete <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
