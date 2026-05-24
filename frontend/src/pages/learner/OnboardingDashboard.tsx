import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Onboarding } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Progress } from "@/components/ui/Progress";
import { prettyStatus } from "@/lib/utils";

export function LearnerOnboarding() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-onboarding"],
    queryFn: Onboarding.mine,
    retry: false,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data) {
    return (
      <Empty
        icon={<Rocket className="h-5 w-5" />}
        title="No onboarding plan yet"
        description="HR will assign your onboarding plan after you're hired."
      />
    );
  }

  const completed = data.modules_json.filter(
    (m) => m.status === "completed",
  ).length;
  const progress = data.modules_json.length
    ? Math.round((completed / data.modules_json.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-brand-600 to-accent-600 px-6 py-7 text-white">
          <div className="text-xs uppercase tracking-wider opacity-90">
            Welcome to the team
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{data.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            Your onboarding plan covers company structure, security, data
            privacy, AI usage, and the specific topics for your role. Complete
            each module to unlock your readiness score.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="Modules" value={`${completed}/${data.modules_json.length}`} />
            <Metric label="Readiness" value={data.readiness_score || 0} />
            <Metric label="Status" value={prettyStatus(data.status)} />
          </div>
          <div className="mt-4">
            <Progress value={progress} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your modules</CardTitle>
          <Badge tone="brand">{data.modules_json.length}</Badge>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {data.modules_json.map((m, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Module {i + 1} · {prettyStatus(m.type)}
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-slate-900">
                      {m.title}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600 line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                  <Badge
                    tone={
                      m.status === "completed"
                        ? "success"
                        : m.status === "in_progress"
                          ? "brand"
                          : "default"
                    }
                    className="capitalize"
                  >
                    {prettyStatus(m.status)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link to={`/learner/onboarding/${i}`}>
                    <Button size="sm">
                      {m.status === "completed"
                        ? "Review"
                        : m.status === "in_progress"
                          ? "Continue"
                          : "Start"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {m.status === "completed" && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Score {m.score}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {data.manager_checklist_json.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Lightbulb className="mr-2 inline h-4 w-4 text-amber-600" /> Manager checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-slate-700">
              {data.manager_checklist_json.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="bg-amber-50/60 p-3 text-xs text-amber-800">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        Onboarding modules are AI-generated drafts approved by HR. They cover
        Responsible AI requirements: harassment prevention, data privacy,
        cybersecurity, and AI usage policy.
      </Card>
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
