import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Lightbulb,
  Rocket,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  Trophy,
  XCircle,
} from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn, formatDateTime, prettyStatus, statusColor } from "@/lib/utils";

export function CandidateDetail() {
  const { id } = useParams();
  const candidateId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const candidate = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => Hiring.getCandidate(candidateId),
    enabled: !Number.isNaN(candidateId),
  });
  const role = useQuery({
    queryKey: ["job-role", candidate.data?.job_role_id],
    queryFn: () => Hiring.getRole(candidate.data!.job_role_id),
    enabled: !!candidate.data,
  });
  const scorecard = useQuery({
    queryKey: ["candidate-scorecard", candidateId],
    queryFn: () => Hiring.getScorecard(candidateId),
    enabled: !Number.isNaN(candidateId),
    retry: false,
  });
  const interview = useQuery({
    queryKey: ["candidate-interview", candidateId],
    queryFn: () => Hiring.getAdminInterview(candidateId),
    enabled: !Number.isNaN(candidateId),
    retry: false,
  });

  const generate = useMutation({
    mutationFn: () => Hiring.generateScorecard(candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate-scorecard", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    },
  });

  const hire = useMutation({
    mutationFn: async () => {
      await Hiring.markHired(candidateId);
      return Hiring.convertToEmployee(candidateId);
    },
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      navigate(`/admin/onboarding/${plan.employee_id}`);
    },
  });

  const reject = useMutation({
    mutationFn: () => Hiring.reject(candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    },
  });

  const assignMore = useMutation({
    mutationFn: () => Hiring.assignTraining(candidateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidate", candidateId] }),
  });

  if (candidate.isLoading || !candidate.data) {
    return (
      <div>
        <Link
          to="/admin/hiring/candidates"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to candidates
        </Link>
        <div className="mt-4 text-sm text-slate-500">Loading candidate…</div>
      </div>
    );
  }

  const c = candidate.data;
  const sc = scorecard.data ?? null;
  const iv = interview.data ?? null;
  const isHired = c.status === "hired";
  const isRejected = c.status === "rejected";

  return (
    <div className="space-y-6">
      <Link
        to="/admin/hiring/candidates"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to candidates
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-6 py-7 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
                <GraduationCap className="h-3.5 w-3.5" />
                {role.data?.title ?? `Role #${c.job_role_id}`}
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">{c.full_name}</h1>
              <div className="mt-1 text-sm text-white/85">{c.email}</div>
              {c.notes && (
                <p className="mt-2 max-w-2xl text-sm text-white/85">{c.notes}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs ${statusColor(c.status)}`}
              >
                {prettyStatus(c.status)}
              </span>
              {c.recommendation && (
                <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs">
                  {prettyStatus(c.recommendation)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Training" value={`${c.training_progress}%`} />
            <Metric label="AI interview" value={c.ai_interview_score || "—"} />
            <Metric label="Readiness" value={c.readiness_score || "—"} />
            <Metric
              label="Hired?"
              value={isHired ? "Yes" : isRejected ? "Rejected" : "Pending"}
            />
          </div>
        </div>

        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {!sc && (
              <Button onClick={() => generate.mutate()} loading={generate.isPending}>
                <Sparkles className="h-4 w-4" /> Generate AI scorecard
              </Button>
            )}
            {sc && !isHired && !isRejected && (
              <>
                <Button onClick={() => hire.mutate()} loading={hire.isPending}>
                  <Trophy className="h-4 w-4" /> Mark as hired
                </Button>
                <Button
                  variant="outline"
                  onClick={() => assignMore.mutate()}
                  loading={assignMore.isPending}
                >
                  <ClipboardList className="h-4 w-4" /> Assign more training
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Reject ${c.full_name}?`)) reject.mutate();
                  }}
                  loading={reject.isPending}
                >
                  <ThumbsDown className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isHired && c.hired_employee_id && (
              <Link to={`/admin/onboarding/${c.hired_employee_id}`}>
                <Button>
                  <Rocket className="h-4 w-4" /> Open onboarding plan
                </Button>
              </Link>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
            <strong>AI recommendations are for HR review only.</strong> ELOT AI
            does not make final hiring decisions. Protected attributes (age,
            race, gender, religion, disability, etc.) are not scored.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="mr-2 inline h-4 w-4 text-brand-600" />
              AI scorecard
            </CardTitle>
            {sc && (
              <Badge
                tone={
                  sc.recommended_next_step === "invite_to_hr_interview"
                    ? "success"
                    : sc.recommended_next_step === "needs_more_review"
                      ? "warning"
                      : "danger"
                }
                className="capitalize"
              >
                {prettyStatus(sc.recommended_next_step)}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {!sc ? (
              <p className="text-sm text-slate-500">
                Scorecard not generated yet — click <em>Generate AI scorecard</em>{" "}
                above.
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Overall readiness
                  </div>
                  <div className="text-4xl font-bold text-brand-700">
                    {sc.overall_readiness_score}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{sc.ai_summary}</div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Strengths
                    </div>
                    <ul className="mt-1 space-y-1 text-slate-700">
                      {sc.strengths_json.map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                      Weaknesses
                    </div>
                    <ul className="mt-1 space-y-1 text-slate-700">
                      {sc.weaknesses_json.map((w, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {sc.skill_scores_json && sc.skill_scores_json.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Skill scores
                    </div>
                    <ul className="mt-1 space-y-2">
                      {sc.skill_scores_json.map((s, i) => (
                        <li key={i}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{s.skill}</span>
                            <span className="text-slate-500">{s.score}</span>
                          </div>
                          <Progress value={s.score} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sc.suggested_hr_questions_json.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested HR interview questions
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                      {sc.suggested_hr_questions_json.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
                  {sc.responsible_ai_note}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI interview transcript</CardTitle>
            {iv && (
              <Badge tone="brand">
                Overall {iv.overall_score} / 100
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {!iv ? (
              <p className="text-sm text-slate-500">
                No AI interview on file yet.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="text-xs text-slate-500">
                  Completed {iv.finished_at ? formatDateTime(iv.finished_at) : "—"}
                </div>
                <ol className="space-y-2">
                  {iv.transcript_json.map((turn, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-2xl px-3 py-2",
                        turn.role === "interviewer"
                          ? "bg-slate-50 border border-slate-100"
                          : turn.role === "candidate"
                            ? "bg-brand-50/50 border border-brand-100"
                            : "bg-amber-50 border border-amber-100",
                      )}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {turn.role}
                        {turn.skill_tested && ` · ${turn.skill_tested}`}
                        {typeof turn.score === "number" &&
                          ` · score ${turn.score}`}
                      </div>
                      <div className="mt-1 text-slate-700">{turn.text}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wide text-white/80">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
