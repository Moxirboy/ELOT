import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { OnboardingOS, type OnbTemplateTaskShape } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  preboarding: "Pre-boarding",
  day_1: "Day 1",
  week_1: "Week 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  extended: "Extended",
};
const STAGES = ["preboarding", "day_1", "week_1", "day_30", "day_60", "day_90", "extended"];

const CATEGORY_TONE: Record<string, string> = {
  compliance: "bg-rose-50 text-rose-700 border-rose-100",
  role_training: "bg-indigo-50 text-indigo-700 border-indigo-100",
  culture: "bg-amber-50 text-amber-700 border-amber-100",
  tools: "bg-sky-50 text-sky-700 border-sky-100",
  practical: "bg-emerald-50 text-emerald-700 border-emerald-100",
  ai_simulation: "bg-purple-50 text-purple-700 border-purple-100",
  manager_review: "bg-slate-100 text-slate-700 border-slate-200",
  supervisor_review: "bg-slate-100 text-slate-700 border-slate-200",
  buddy_checkin: "bg-pink-50 text-pink-700 border-pink-100",
  employee_feedback: "bg-teal-50 text-teal-700 border-teal-100",
  it_setup: "bg-cyan-50 text-cyan-700 border-cyan-100",
  final_evaluation: "bg-amber-100 text-amber-800 border-amber-200",
};

export function TemplateDetail() {
  const { id } = useParams();
  const tplId = Number(id);
  const { data, isLoading } = useQuery({
    queryKey: ["os-template", tplId],
    queryFn: () => OnboardingOS.getTemplate(tplId),
    enabled: !Number.isNaN(tplId),
  });

  if (isLoading || !data) {
    return <div className="text-slate-500">Loading template…</div>;
  }

  const tasksByStage: Record<string, OnbTemplateTaskShape[]> = {};
  for (const t of data.tasks) {
    tasksByStage[t.stage] = [...(tasksByStage[t.stage] ?? []), t];
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/onboarding-os/templates"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </Link>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.role_name} · {data.department} · {data.duration_days}-day plan ·
                pass ≥ {data.required_score}
              </p>
              {data.description && (
                <p className="mt-3 max-w-3xl text-sm text-slate-700">
                  {data.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={data.ai_generated ? "brand" : "default"}>
                {data.ai_generated ? "AI draft" : "Custom"}
              </Badge>
              <Link
                to={`/admin/onboarding-os/instances/new?template=${data.id}`}
              >
                <Button>
                  Use template <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          {data.success_criteria && (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <ShieldCheck className="mr-1 inline h-4 w-4" />
              <strong>Success criteria:</strong> {data.success_criteria}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <ClipboardCheck className="mr-2 inline h-4 w-4" /> Task plan (
            {data.tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {STAGES.filter((s) => tasksByStage[s]?.length).map((s) => (
              <div key={s}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2">
                    {STAGE_LABEL[s] ?? s}
                  </span>
                  <span className="text-slate-400">
                    {tasksByStage[s].length} task
                    {tasksByStage[s].length === 1 ? "" : "s"}
                  </span>
                </div>
                <ol className="space-y-2">
                  {tasksByStage[s].map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900">
                            {t.title}
                          </div>
                          {t.description && (
                            <div className="mt-1 text-xs text-slate-500">
                              {t.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 capitalize",
                              CATEGORY_TONE[t.category] ??
                                "bg-slate-100 text-slate-700 border-slate-200",
                            )}
                          >
                            {t.category.replace("_", " ")}
                          </span>
                          <span className="rounded-full border border-slate-200 px-2 py-0.5">
                            Day {t.default_due_day}
                          </span>
                          <span className="rounded-full border border-slate-200 px-2 py-0.5">
                            Owner: {t.default_owner_role}
                          </span>
                          <span className="rounded-full border border-slate-200 px-2 py-0.5">
                            Reviewer: {t.default_reviewer_role}
                          </span>
                          {t.approval_required && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                              Approval required
                            </span>
                          )}
                          {typeof t.required_score === "number" && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                              Score ≥ {t.required_score}
                            </span>
                          )}
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 capitalize">
                            {t.priority} priority
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
