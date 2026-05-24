import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  FileText,
  Lightbulb,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AI, Courses, type GeneratedCourseJSON } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { CourseCover } from "@/components/learning/CourseCover";
import { cn, riskColor } from "@/lib/utils";

const DEMO_POLICY = `Employees must not share customer data through personal email, Telegram, WhatsApp, USB drives, or public AI tools. Customer data must only be stored and transferred through approved company systems. If an employee receives suspicious links, requests for passwords, or unusual payment requests, they must report it to the security team immediately.`;

const AUDIENCES = ["All Employees", "HR", "Engineering", "Sales", "Managers"];

type CheckKey = "lessons" | "scenarios" | "quiz" | "limitations";

export function CourseBuilder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("Data Protection & Acceptable Use");
  const [text, setText] = useState(DEMO_POLICY);
  const [language, setLanguage] = useState("English");
  const [audience, setAudience] = useState("All Employees");
  const [generated, setGenerated] = useState<GeneratedCourseJSON | null>(null);
  const [previewTab, setPreviewTab] = useState<"learner" | "structure">(
    "learner",
  );
  const [reviewed, setReviewed] = useState<Record<CheckKey, boolean>>({
    lessons: false,
    scenarios: false,
    quiz: false,
    limitations: false,
  });

  const generate = useMutation({
    mutationFn: () =>
      AI.generateCourse({
        policy_title: title,
        policy_text: text,
        language,
        audience,
      }),
    onSuccess: (course) => {
      setGenerated(course);
      setReviewed({ lessons: false, scenarios: false, quiz: false, limitations: false });
    },
  });

  // Re-generate just one section by re-running the model and replacing
  // the selected key in the existing draft.
  const regenerate = useMutation({
    mutationFn: (which: "lessons" | "scenarios" | "quiz") =>
      AI.generateCourse({
        policy_title: title,
        policy_text: text,
        language,
        audience,
      }).then((fresh) => ({ which, fresh })),
    onSuccess: ({ which, fresh }) => {
      setGenerated((prev) => {
        if (!prev) return fresh;
        return { ...prev, [which]: fresh[which] };
      });
      setReviewed((r) => ({ ...r, [which]: false }));
    },
  });

  const save = useMutation({
    mutationFn: () => {
      if (!generated) throw new Error("Nothing to save");
      return Courses.create({
        title: generated.title || title,
        description: generated.description,
        estimated_minutes: generated.estimatedMinutes,
        difficulty: generated.difficulty,
        language,
        generated_json: generated,
      });
    },
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      navigate(`/admin/courses/${course.id}`);
    },
  });

  const allReviewed = useMemo(
    () => Object.values(reviewed).every(Boolean),
    [reviewed],
  );

  // Auto-check limitations when there's nothing to review
  useEffect(() => {
    if (generated && (generated.limitations?.length ?? 0) === 0) {
      setReviewed((r) => ({ ...r, limitations: true }));
    }
  }, [generated]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Course Builder</h1>
        <p className="text-sm text-slate-500">
          Paste a policy, generate a structured micro-course, review it like a learner would, then publish.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        {/* LEFT: form + reviewer checklist */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Policy input</CardTitle>
              <Badge tone="brand">Step 1</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Policy title" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Data Protection Policy"
                />
              </Field>

              <Field label="Audience">
                <div className="flex flex-wrap gap-1.5">
                  {AUDIENCES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAudience(a)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                        audience === a
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                      aria-pressed={audience === a}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Policy text"
                required
                description="Paste the full policy content here."
              >
                <Textarea
                  rows={9}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>

              <Field label="Language">
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>English</option>
                  <option>Uzbek</option>
                  <option>Russian</option>
                </Select>
              </Field>

              <Button
                size="lg"
                className="w-full"
                loading={generate.isPending}
                onClick={() => generate.mutate()}
                disabled={!title || !text}
              >
                <Sparkles className="h-5 w-5" />
                {generate.isPending ? "Generating…" : "Generate AI course"}
              </Button>
              {generate.error && (
                <p className="text-sm text-rose-600">
                  {(generate.error as Error).message}
                </p>
              )}
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <div className="mb-1 flex items-center gap-1 font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5" /> Responsible AI
                </div>
                Review and edit the output before publishing. AI is not legal
                advice.
              </div>
            </CardContent>
          </Card>

          {generated && (
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
                {(["lessons", "scenarios", "quiz", "limitations"] as CheckKey[]).map(
                  (k) => (
                    <label
                      key={k}
                      className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={reviewed[k]}
                        onChange={(e) =>
                          setReviewed((r) => ({ ...r, [k]: e.target.checked }))
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm capitalize text-slate-700">
                        I reviewed the <strong>{k}</strong>
                      </span>
                    </label>
                  ),
                )}
                <Button
                  size="lg"
                  className="w-full"
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!allReviewed}
                  title={
                    allReviewed
                      ? undefined
                      : "Tick all four checkboxes to enable publishing"
                  }
                >
                  <Save className="h-5 w-5" /> Save & publish course
                </Button>
                {!allReviewed && (
                  <p className="text-center text-xs text-slate-500">
                    All four checks must be ticked before publishing.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: live preview */}
        <Card className="min-h-[32rem] overflow-hidden">
          <CardHeader>
            <CardTitle>
              <Eye className="mr-2 inline h-4 w-4" /> Live preview
            </CardTitle>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
              {(["learner", "structure"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPreviewTab(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    previewTab === t
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500",
                  )}
                  aria-pressed={previewTab === t}
                >
                  {t === "learner" ? "Learner view" : "Structure"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {!generated ? (
              <Empty
                icon={<FileText className="h-5 w-5" />}
                title="No course yet"
                description="Generate a course on the left, then preview it here exactly as a learner will see it."
              />
            ) : previewTab === "learner" ? (
              <LearnerPreview generated={generated} language={language} />
            ) : (
              <StructurePreview
                generated={generated}
                regenerate={regenerate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function LearnerPreview({
  generated,
  language,
}: {
  generated: GeneratedCourseJSON;
  language: string;
}) {
  return (
    <div className="space-y-5">
      <CourseCover
        title={generated.title}
        subtitle={generated.description}
        variant="splash"
        minutes={generated.estimatedMinutes}
        difficulty={generated.difficulty}
        language={language}
      />

      {generated.learningObjectives?.length > 0 && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="mb-2 text-sm font-semibold text-brand-700">
            What learners will learn
          </div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {generated.learningObjectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title={`Lessons (${generated.lessons.length})`}>
        <ol className="space-y-3">
          {generated.lessons.map((l, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-100"
            >
              <CourseCover title={l.title} subtitle={`Lesson ${i + 1}`} variant="hero" />
              <div className="space-y-2 p-4 text-sm">
                <p className="text-slate-700">{l.content}</p>
                {l.keyTakeaway && (
                  <div className="rounded-xl bg-brand-50 p-2 text-xs text-brand-700">
                    <Lightbulb className="mr-1 inline h-3.5 w-3.5" /> {l.keyTakeaway}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={`Scenarios (${generated.scenarios.length})`}>
        <ul className="space-y-2">
          {generated.scenarios.map((s, i) => (
            <li key={i} className="rounded-xl border border-slate-100 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-900">{s.title}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(s.riskLevel)}`}
                >
                  {s.riskLevel} risk
                </span>
              </div>
              <p className="text-slate-700">{s.situation}</p>
              <p className="mt-1 text-xs italic text-slate-500">Q: {s.question}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Quiz (${generated.quiz.length})`}>
        <ul className="space-y-2">
          {generated.quiz.map((q, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-100 p-3 text-sm"
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
      </Section>

      {generated.limitations?.length > 0 && (
        <Section title="Limitations">
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            {generated.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function StructurePreview({
  generated,
  regenerate,
}: {
  generated: GeneratedCourseJSON;
  regenerate: ReturnType<typeof useMutation<{ which: "lessons" | "scenarios" | "quiz"; fresh: GeneratedCourseJSON }, Error, "lessons" | "scenarios" | "quiz">>;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-2">
        {(["lessons", "scenarios", "quiz"] as const).map((k) => (
          <button
            key={k}
            onClick={() => regenerate.mutate(k)}
            disabled={regenerate.isPending}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Regenerate
            </div>
            <div className="mt-1 flex items-center justify-between text-sm font-semibold text-slate-900">
              <span className="capitalize">{k}</span>
              <Sparkles className="h-4 w-4 text-brand-500" />
            </div>
            <div className="text-xs text-slate-500">
              {regenerate.isPending && regenerate.variables === k
                ? "Running…"
                : "Re-roll this section"}
            </div>
          </button>
        ))}
      </div>
      <details open className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
          Raw JSON · {Object.keys(generated).length} fields
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-700">
          {JSON.stringify(generated, null, 2)}
        </pre>
      </details>
    </div>
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
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}
