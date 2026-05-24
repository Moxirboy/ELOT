import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Rocket, ShieldCheck } from "lucide-react";
import { Onboarding } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Progress } from "@/components/ui/Progress";
import { prettyStatus } from "@/lib/utils";

export function OnboardingPlanView() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-plan", id],
    queryFn: () => Onboarding.forEmployee(id),
    enabled: !Number.isNaN(id),
    retry: false,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/onboarding"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to onboarding
        </Link>
        <Empty
          title="No onboarding plan yet"
          description="Hire a candidate to generate their onboarding plan automatically."
        />
      </div>
    );
  }

  const completed = (data.modules_json ?? []).filter(
    (m) => m.status === "completed",
  );
  const progress = data.modules_json.length
    ? Math.round((completed.length / data.modules_json.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/onboarding"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to onboarding
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-brand-600 to-accent-600 px-6 py-7 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
            <Rocket className="h-3.5 w-3.5" /> Onboarding plan
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{data.title}</h1>
          <div className="mt-2 text-sm text-white/85">
            Employee #{data.employee_id} · {data.modules_json.length} modules
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="Progress" value={`${progress}%`} />
            <Metric label="Avg readiness" value={data.readiness_score || 0} />
            <Metric label="Status" value={prettyStatus(data.status)} />
          </div>
        </div>
        <CardContent className="p-6">
          <Progress value={progress} className="mb-4" />

          <ol className="space-y-3 text-sm">
            {data.modules_json.map((m, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-100 p-4 text-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Module {i + 1} · {prettyStatus(m.type)}
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-slate-900">
                      {m.title}
                    </div>
                    <p className="mt-1 text-slate-600 line-clamp-2">
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
                {m.status === "completed" && (
                  <div className="mt-2 text-xs text-slate-500">
                    Score: <strong>{m.score}</strong>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {data.manager_checklist_json.length > 0 && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ClipboardCheck className="h-4 w-4" /> Manager checklist
              </div>
              <ul className="space-y-1 text-slate-700">
                {data.manager_checklist_json.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            Onboarding modules cover the Responsible AI requirements: data
            privacy, harassment prevention, cybersecurity awareness, and AI
            usage policy.
          </div>
        </CardContent>
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
