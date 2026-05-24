import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Bot,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { CandidatePortal } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Progress } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { prettyStatus, riskColor } from "@/lib/utils";

export function CandidateDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-dashboard"],
    queryFn: CandidatePortal.dashboard,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data) {
    return (
      <Empty
        title="Something went wrong"
        description="Could not load your portal — try logging in again."
      />
    );
  }

  const completed = data.modules.filter((m) => m.status === "completed").length;
  const totalQs = 5;
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-6 py-7 text-white">
          <div className="text-xs uppercase tracking-wider opacity-90">
            Applying for
          </div>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{data.role.title}</h1>
          <p className="mt-1 text-sm text-white/85">
            {data.role.department} · {data.role.seniority}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-white/90">
            {data.role.role_profile_json?.summary || data.role.description}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            <span>Next step:</span>
            <strong>{data.next_action}</strong>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Training modules"
          value={`${completed}/${data.modules.length}`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="AI interview"
          value={prettyStatus(data.ai_interview_status)}
          icon={<Bot className="h-5 w-5" />}
        />
        <StatCard
          label="Readiness"
          value={data.candidate.readiness_score || "—"}
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="Status"
          value={prettyStatus(data.candidate.status)}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your training plan</CardTitle>
          <Badge tone="brand">{data.modules.length}</Badge>
        </CardHeader>
        <CardContent>
          {data.modules.length === 0 ? (
            <Empty
              title="No training assigned yet"
              description="HR will assign your training modules — check back soon."
            />
          ) : (
            <ol className="space-y-3">
              {data.modules.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Module {m.order_index + 1}
                      </div>
                      <div className="mt-0.5 text-base font-semibold text-slate-900">
                        {m.title}
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-slate-600 line-clamp-2">
                        {m.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${riskColor(
                        m.status === "completed"
                          ? "low"
                          : m.status === "in_progress"
                            ? "medium"
                            : "high",
                      )}`}
                    >
                      {prettyStatus(m.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Link to={`/candidate/training/${m.id}`}>
                      <Button size="sm">
                        {m.status === "completed"
                          ? "Review"
                          : m.status === "in_progress"
                            ? "Continue"
                            : "Start module"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    {m.status === "completed" && (
                      <span className="text-xs text-slate-500">
                        Score {m.score}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Bot className="mr-2 inline h-4 w-4 text-brand-600" /> AI interview
          </CardTitle>
          <Badge
            tone={
              data.ai_interview_status === "completed"
                ? "success"
                : data.ai_interview_status === "in_progress"
                  ? "brand"
                  : "default"
            }
            className="capitalize"
          >
            {prettyStatus(data.ai_interview_status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-slate-700">
            A 5-question conversation about real situations you'd face in this
            role. Questions are job-related only — never about age, religion,
            family, or other protected attributes.
          </p>
          {data.ai_interview_status === "in_progress" && (
            <Progress
              value={(data.ai_interview_question_count / totalQs) * 100}
            />
          )}
          <Link to="/candidate/ai-interview">
            <Button>
              {data.ai_interview_status === "completed"
                ? "Review summary"
                : data.ai_interview_status === "in_progress"
                  ? "Continue interview"
                  : "Start AI interview"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="bg-amber-50/60 p-3 text-xs text-amber-800">
        <strong>Responsible AI:</strong> ELOT AI gives HR a structured
        recommendation. Final hiring decisions are always made by a human.
      </Card>
    </div>
  );
}
