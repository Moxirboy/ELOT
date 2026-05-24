import { useState } from "react";
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
import { CandidatePortal } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export function CandidateTraining() {
  const { moduleId } = useParams();
  const id = Number(moduleId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const module = useQuery({
    queryKey: ["candidate-module", id],
    queryFn: () => CandidatePortal.getModule(id),
    enabled: !Number.isNaN(id),
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof CandidatePortal.submitQuiz>> | null
  >(null);

  const submit = useMutation({
    mutationFn: () => {
      if (!module.data) throw new Error("no module");
      const sorted = module.data.quiz_json.map(
        (_, i) => answers[i] ?? "",
      );
      return CandidatePortal.submitQuiz(id, sorted);
    },
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["candidate-dashboard"] });
    },
  });

  if (module.isLoading || !module.data) {
    return <div className="text-slate-500">Loading module…</div>;
  }
  const m = module.data;
  const allAnswered = m.quiz_json.every((_, i) => !!answers[i]);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/candidate/dashboard")}
        className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-6 py-6 text-white">
          <div className="text-xs uppercase tracking-wider opacity-90">
            <BookOpen className="mr-1 inline h-3.5 w-3.5" /> Module {m.order_index + 1}
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{m.title}</h1>
          <p className="mt-1 text-sm text-white/85">{m.description}</p>
        </div>
        <CardContent className="space-y-4 p-6">
          <p className="leading-relaxed text-slate-700">{m.content}</p>

          {m.quiz_json.length > 0 && (
            <div className="space-y-4">
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quiz · {m.quiz_json.length} question(s)
                </div>
              </div>
              <ol className="space-y-4">
                {m.quiz_json.map((q, i) => {
                  const picked = answers[i];
                  const fb = result?.feedback[i];
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
                          const isCorrect =
                            result && fb && o === fb.correct_answer;
                          const wasMine = result && fb && o === fb.your_answer;
                          return (
                            <button
                              key={o}
                              disabled={!!result}
                              onClick={() =>
                                setAnswers((a) => ({ ...a, [i]: o }))
                              }
                              className={cn(
                                "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                                result
                                  ? isCorrect
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : wasMine
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
                      {fb && (
                        <div className="mt-2 text-xs">
                          <span
                            className={cn(
                              "font-semibold",
                              fb.is_correct ? "text-emerald-700" : "text-rose-700",
                            )}
                          >
                            {fb.is_correct ? (
                              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="mr-1 inline h-3.5 w-3.5" />
                            )}
                            {fb.is_correct ? "Correct" : "Not quite"}
                          </span>
                          {fb.explanation && ` — ${fb.explanation}`}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {!result ? (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => submit.mutate()}
                  loading={submit.isPending}
                  disabled={!allAnswered}
                >
                  <Sparkles className="h-5 w-5" /> Submit quiz
                </Button>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Module score
                  </div>
                  <div className="text-4xl font-bold text-brand-700">
                    {result.score}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {result.correct} / {result.total} correct
                  </div>
                  <Button
                    className="mt-3"
                    onClick={() => navigate("/candidate/dashboard")}
                  >
                    Continue <ArrowRight className="h-4 w-4" />
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
