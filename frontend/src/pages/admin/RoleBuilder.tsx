import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Lightbulb,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Hiring, type GeneratedRolePlan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { cn } from "@/lib/utils";

const SENIORITIES = ["Junior", "Mid", "Senior", "Lead", "Manager"];

export function RoleBuilder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("Junior Customer Support Specialist");
  const [department, setDepartment] = useState("Customer Support");
  const [seniority, setSeniority] = useState("Junior");
  const [description, setDescription] = useState(
    "We are hiring a Junior Customer Support Specialist. The candidate should communicate clearly in English and Uzbek, handle angry customers, understand refund policy, use CRM basics, protect customer data, identify phishing attempts, and escalate difficult cases to managers.",
  );
  const [companyNotes, setCompanyNotes] = useState(
    "Customer data must only move through approved systems. Refund requests over $100 require manager approval.",
  );
  const [generated, setGenerated] = useState<GeneratedRolePlan | null>(null);
  const [previewTab, setPreviewTab] = useState<
    "role" | "training" | "interview" | "rubric" | "onboarding"
  >("role");

  const generate = useMutation({
    mutationFn: () =>
      Hiring.generateRolePlan({
        title,
        department,
        seniority,
        role_description: description,
        company_notes: companyNotes,
      }),
    onSuccess: (plan) => setGenerated(plan),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!generated) throw new Error("Generate a plan first");
      return Hiring.createRole({
        title,
        department,
        seniority,
        description: generated.roleProfile.summary || description,
        required_skills_json: generated.requiredSkills as any,
        training_map_json: generated.trainingMap as any,
        interview_plan_json: generated.interviewPlan as any,
        assessment_plan_json: generated.assessmentPlan as any,
        rubric_json: generated.rubric as any,
        onboarding_plan_json: generated.onboardingPlan as any,
        role_profile_json: generated.roleProfile as any,
        responsible_ai_notes_json: generated.responsibleAINotes,
      } as any);
    },
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ["job-roles"] });
      navigate(`/admin/hiring/roles/${role.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Sparkles className="mr-2 inline h-6 w-6 text-brand-600" />
          AI Role Builder
        </h1>
        <p className="text-sm text-slate-500">
          Describe the role you want to hire for. ELOT AI generates a training
          map, AI interview plan, rubric, and onboarding plan. HR keeps the
          final hiring decision.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role brief</CardTitle>
              <Badge tone="brand">Step 1</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Job title" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Junior Customer Support Specialist"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Department">
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </Field>
                <Field label="Seniority">
                  <Select
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                  >
                    {SENIORITIES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                label="What kind of person do you want to hire?"
                description="Skills, language requirements, day-to-day work. Do not include protected attributes."
                required
              >
                <Textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <Field label="Company-specific notes" description="Policies, escalation thresholds, tone.">
                <Textarea
                  rows={3}
                  value={companyNotes}
                  onChange={(e) => setCompanyNotes(e.target.value)}
                />
              </Field>
              <Button
                size="lg"
                className="w-full"
                onClick={() => generate.mutate()}
                loading={generate.isPending}
                disabled={!title || !description}
              >
                <Sparkles className="h-5 w-5" />
                {generate.isPending
                  ? "Generating…"
                  : "Generate training & interview map"}
              </Button>
              {generate.error && (
                <p className="text-sm text-rose-600">
                  {(generate.error as Error).message}
                </p>
              )}
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                Do not include sensitive personal information or protected
                attributes (age, race, gender, religion, nationality, disability)
                in role requirements. ELOT AI does not make final hiring decisions.
              </div>
            </CardContent>
          </Card>

          {generated && (
            <Card>
              <CardHeader>
                <CardTitle>Publish role</CardTitle>
                <Badge tone="brand">Step 2</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-600">
                  Save this role to start adding candidates. You can edit any
                  generated section after saving.
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                >
                  <Save className="h-4 w-4" /> Save role & open candidates
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="min-h-[32rem]">
          <CardHeader>
            <CardTitle>
              <Eye className="mr-2 inline h-4 w-4" /> Plan preview
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-0.5 text-xs">
              {(
                [
                  ["role", "Role"],
                  ["training", "Training"],
                  ["interview", "Interview"],
                  ["rubric", "Rubric"],
                  ["onboarding", "Onboarding"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPreviewTab(key)}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    previewTab === key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {!generated ? (
              <Empty
                icon={<FileText className="h-5 w-5" />}
                title="No plan generated yet"
                description="Fill in the brief on the left and click Generate."
              />
            ) : (
              <PlanPreview plan={generated} tab={previewTab} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlanPreview({
  plan,
  tab,
}: {
  plan: GeneratedRolePlan;
  tab: "role" | "training" | "interview" | "rubric" | "onboarding";
}) {
  if (tab === "role") {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {plan.roleProfile.title}
          </h2>
          <p className="mt-1 text-slate-500">
            {plan.roleProfile.department} · {plan.roleProfile.seniority}
          </p>
          <p className="mt-2 text-slate-700">{plan.roleProfile.summary}</p>
        </div>
        <Section title="Ideal candidate">
          <p className="text-slate-700">{plan.roleProfile.idealCandidate}</p>
        </Section>
        <Section title="Success outcomes (90 days)">
          <ul className="space-y-1.5">
            {plan.roleProfile.successOutcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={`Required skills (${plan.requiredSkills.length})`}>
          <ul className="grid gap-2 md:grid-cols-2">
            {plan.requiredSkills.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-100 p-3 text-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs capitalize",
                      s.importance === "high"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : s.importance === "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100",
                    )}
                  >
                    {s.importance}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="capitalize">{s.category}</span> · {s.description}
                </p>
              </li>
            ))}
          </ul>
        </Section>
        {plan.responsibleAINotes.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Responsible AI notes:</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {plan.responsibleAINotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  if (tab === "training") {
    return (
      <ol className="space-y-3 text-sm">
        {plan.trainingMap.map((m, i) => (
          <li
            key={i}
            className="rounded-2xl border border-slate-100 p-4 text-slate-700"
          >
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Module {i + 1}
            </div>
            <div className="mt-0.5 text-base font-semibold text-slate-900">
              {m.title}
            </div>
            <p className="mt-1 text-slate-600">{m.content || m.description}</p>
            {m.quiz.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-100 p-3 text-xs">
                <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                  Quiz ({m.quiz.length})
                </div>
                <ul className="space-y-1">
                  {m.quiz.slice(0, 2).map((q, j) => (
                    <li key={j}>• {q.question}</li>
                  ))}
                  {m.quiz.length > 2 && (
                    <li className="text-slate-400">+ {m.quiz.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    );
  }
  if (tab === "interview") {
    return (
      <ol className="space-y-3 text-sm">
        {plan.interviewPlan.map((q, i) => (
          <li
            key={i}
            className="rounded-2xl border border-slate-100 p-4 text-slate-700"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Question {i + 1}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                {q.skillTested}
              </span>
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {q.question}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
              <div className="rounded-xl bg-emerald-50 p-2">
                <div className="font-semibold text-emerald-700">
                  Good answer signals
                </div>
                <ul className="mt-1 space-y-0.5">
                  {q.goodAnswerSignals.map((s, j) => (
                    <li key={j}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-rose-50 p-2">
                <div className="font-semibold text-rose-700">Red flags</div>
                <ul className="mt-1 space-y-0.5">
                  {q.redFlags.map((s, j) => (
                    <li key={j}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  if (tab === "rubric") {
    return (
      <div className="space-y-3 text-sm">
        <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
          <Lightbulb className="mr-1 inline h-4 w-4" /> Passing score:{" "}
          <strong>{plan.rubric.passingScore}</strong>
        </div>
        <ul className="space-y-2">
          {plan.rubric.categories.map((c, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-100 p-3 text-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500">weight {c.weight}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{c.description}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ol className="space-y-2 text-sm">
      {plan.onboardingPlan.map((m, i) => (
        <li
          key={i}
          className="rounded-xl border border-slate-100 p-3 text-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{m.title}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
              {m.type.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{m.description}</p>
        </li>
      ))}
    </ol>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}
