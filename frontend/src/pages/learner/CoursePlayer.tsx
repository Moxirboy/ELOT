import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Download,
  Lightbulb,
  PlayCircle,
  Sparkles,
  Target,
} from "lucide-react";
import {
  AI,
  Assignments,
  Certificates,
  Learner,
  type CourseDetail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { SceneVignette } from "@/components/learning/SceneVignette";
import { LessonAudio } from "@/components/learning/LessonAudio";
import { CourseCover } from "@/components/learning/CourseCover";
import {
  CourseSteps,
  type StepDescriptor,
} from "@/components/learning/CourseSteps";
import { cn, firstName, riskColor } from "@/lib/utils";

type Step =
  | { type: "intro" }
  | { type: "lesson"; index: number }
  | { type: "scenario"; index: number }
  | { type: "quiz"; index: number }
  | { type: "result" };

type ScenarioFeedback = Awaited<ReturnType<typeof AI.evaluateScenario>>;

const RESUME_KEY = (assignmentId: number, courseId: number) =>
  `elot:resume:${assignmentId || "preview"}:${courseId}`;

export function CoursePlayer() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const courseId = Number(id);
  const assignmentId = Number(params.get("assignment") || 0);

  const { data, isLoading } = useQuery({
    queryKey: ["learner-course", courseId],
    queryFn: () => Learner.course(courseId),
    enabled: !Number.isNaN(courseId),
  });

  const learner = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: Learner.dashboard,
  });

  // ---- Step graph ------------------------------------------------------
  // intro → lessons (with embedded knowledge check) → scenarios → leftover
  // quiz questions → result.
  const { steps, descriptors, lessonChecks, leftoverQuiz } = useMemo(() => {
    if (!data) {
      return {
        steps: [] as Step[],
        descriptors: [] as StepDescriptor[],
        lessonChecks: {} as Record<number, CourseDetail["quiz"][number]>,
        leftoverQuiz: [] as CourseDetail["quiz"],
      };
    }
    // Pair one quiz item with each lesson. Match by topic where possible,
    // otherwise round-robin.
    const remainingQuiz = [...data.quiz];
    const checks: Record<number, CourseDetail["quiz"][number]> = {};
    data.lessons.forEach((lesson) => {
      const titleLc = `${lesson.title} ${lesson.content}`.toLowerCase();
      const matchIdx = remainingQuiz.findIndex((q) =>
        titleLc.includes((q.topic || "").toLowerCase().split(" ")[0] || "__"),
      );
      const picked = remainingQuiz.splice(
        matchIdx >= 0 ? matchIdx : 0,
        1,
      )[0];
      if (picked) checks[lesson.id] = picked;
    });

    const out: Step[] = [{ type: "intro" }];
    const labels: StepDescriptor[] = [
      { kind: "intro", title: data.title, label: "Welcome" },
    ];
    data.lessons.forEach((l, i) => {
      out.push({ type: "lesson", index: i });
      labels.push({ kind: "lesson", title: l.title, label: `Lesson ${i + 1}` });
    });
    data.scenarios.forEach((s, i) => {
      out.push({ type: "scenario", index: i });
      labels.push({
        kind: "scenario",
        title: s.title,
        label: `Scenario ${i + 1}`,
      });
    });
    remainingQuiz.forEach((q, i) => {
      out.push({ type: "quiz", index: data.quiz.indexOf(q) });
      labels.push({
        kind: "quiz",
        title: q.topic || `Question ${i + 1}`,
        label: `Final quiz ${i + 1}`,
      });
    });
    out.push({ type: "result" });
    labels.push({ kind: "result", title: "Wrap up & certificate", label: "Result" });
    return {
      steps: out,
      descriptors: labels,
      lessonChecks: checks,
      leftoverQuiz: remainingQuiz,
    };
  }, [data]);

  const [stepIdx, setStepIdx] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, ScenarioFeedback>>(
    {},
  );
  const [startMutated, setStartMutated] = useState(false);

  // ---- Resume from localStorage ---------------------------------------
  useEffect(() => {
    if (!data) return;
    const raw = localStorage.getItem(RESUME_KEY(assignmentId, courseId));
    if (!raw) return;
    const saved = Number(raw);
    if (!Number.isFinite(saved)) return;
    const safe = Math.max(0, Math.min(saved, steps.length - 1));
    setStepIdx(safe);
    setMaxReached(safe);
  }, [data, steps.length, assignmentId, courseId]);

  // Persist progress whenever we move.
  useEffect(() => {
    if (!data) return;
    localStorage.setItem(
      RESUME_KEY(assignmentId, courseId),
      String(stepIdx),
    );
  }, [stepIdx, data, assignmentId, courseId]);

  useEffect(() => {
    setMaxReached((m) => Math.max(m, stepIdx));
  }, [stepIdx]);

  // Auto-start the assignment when user opens the page
  useEffect(() => {
    if (assignmentId && !startMutated) {
      Assignments.start(assignmentId).catch(() => {});
      setStartMutated(true);
    }
  }, [assignmentId, startMutated]);

  const evaluate = useMutation({
    mutationFn: (vars: { scenario_id: number; user_answer: string }) =>
      AI.evaluateScenario({
        course_id: courseId,
        scenario_id: vars.scenario_id,
        employee_id: learner.data?.employee_id ?? user?.id ?? 0,
        user_answer: vars.user_answer,
      }),
    onSuccess: (res, vars) =>
      setFeedbacks((f) => ({ ...f, [vars.scenario_id]: res })),
  });

  const complete = useMutation({
    mutationFn: (score: number) =>
      Assignments.complete(assignmentId, {
        score,
        risk_level: score >= 80 ? "low" : score >= 60 ? "medium" : "high",
      }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["learner-dashboard"] });
      if (learner.data?.employee_id) {
        try {
          await Certificates.issue(learner.data.employee_id, courseId);
        } catch {
          // ignore — server also auto-issues on completion
        }
      }
      // Clear resume marker once the course is done
      localStorage.removeItem(RESUME_KEY(assignmentId, courseId));
    },
  });

  if (isLoading || !data) {
    return <div className="text-slate-500">Loading course…</div>;
  }

  const current = steps[stepIdx];
  const totalSteps = steps.length;
  const progress = Math.round(((stepIdx + 1) / totalSteps) * 100);

  // Quiz scoring uses every answered item, lesson checks + leftover quizzes.
  const allQuizItems = data.quiz;
  const quizScore = (() => {
    if (!allQuizItems.length) return 0;
    let correct = 0;
    for (const q of allQuizItems) {
      if ((answers[q.id] ?? "") === q.correct_answer) correct += 1;
    }
    return Math.round((correct / allQuizItems.length) * 100);
  })();

  const allQuizAnswered = allQuizItems.every((q) => !!answers[q.id]);

  // Continue gating
  const continueDisabled = (() => {
    if (stepIdx >= totalSteps - 1) return true;
    if (current?.type === "scenario") {
      const sid = data.scenarios[current.index].id;
      return !feedbacks[sid];
    }
    if (current?.type === "lesson") {
      const lesson = data.lessons[current.index];
      const check = lessonChecks[lesson.id];
      return !!check && !answers[check.id];
    }
    if (current?.type === "quiz") {
      const q = data.quiz[current.index];
      return !answers[q.id];
    }
    return false;
  })();

  const learnerName = firstName(
    learner.data?.employee_name ?? user?.full_name ?? "You",
  );

  function jumpTo(idx: number) {
    setStepIdx(Math.max(0, Math.min(idx, totalSteps - 1)));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/learner/dashboard")}
        className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <CourseSteps
            steps={descriptors}
            currentIndex={stepIdx}
            maxReached={maxReached}
            onJump={jumpTo}
          />
        </aside>

        {/* Main column */}
        <div className="space-y-5">
          {/* Header strip */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-slate-900">
                    {data.title}
                  </h1>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                    {data.description}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Step {stepIdx + 1} of {totalSteps}
                </div>
              </div>
              <div className="mt-3">
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>

          {current?.type === "intro" && (
            <IntroSplash
              course={data}
              learnerName={learnerName}
              lessonCount={data.lessons.length}
              scenarioCount={data.scenarios.length}
              quizCount={data.quiz.length}
              onStart={() => jumpTo(1)}
              onDownloadTranscript={() =>
                downloadTranscript(courseId, data.title)
              }
            />
          )}

          {current?.type === "lesson" && (
            <LessonView
              lesson={data.lessons[current.index]}
              courseTitle={data.title}
              check={lessonChecks[data.lessons[current.index].id]}
              checkAnswer={
                lessonChecks[data.lessons[current.index].id]
                  ? answers[lessonChecks[data.lessons[current.index].id].id]
                  : undefined
              }
              onCheckAnswer={(opt, qid) =>
                setAnswers((a) => ({ ...a, [qid]: opt }))
              }
            />
          )}

          {current?.type === "scenario" && (
            <SceneVignette
              scenario={data.scenarios[current.index]}
              value={
                scenarioAnswers[data.scenarios[current.index].id] ?? ""
              }
              onChange={(v) =>
                setScenarioAnswers((a) => ({
                  ...a,
                  [data.scenarios[current.index].id]: v,
                }))
              }
              feedback={feedbacks[data.scenarios[current.index].id]}
              submitting={evaluate.isPending}
              onSubmit={() =>
                evaluate.mutate({
                  scenario_id: data.scenarios[current.index].id,
                  user_answer:
                    scenarioAnswers[data.scenarios[current.index].id] ?? "",
                })
              }
              learnerFirstName={learnerName}
            />
          )}

          {current?.type === "quiz" && (
            <QuizQuestion
              q={data.quiz[current.index]}
              number={leftoverQuiz.indexOf(data.quiz[current.index]) + 1}
              total={leftoverQuiz.length}
              answer={answers[data.quiz[current.index].id]}
              onAnswer={(opt) =>
                setAnswers((a) => ({ ...a, [data.quiz[current.index].id]: opt }))
              }
            />
          )}

          {current?.type === "result" && (
            <ResultView
              score={quizScore}
              completed={complete.isSuccess}
              onComplete={() => complete.mutate(quizScore)}
              loading={complete.isPending}
              course={data}
            />
          )}

          {!allQuizAnswered && current?.type === "result" && (
            <Card className="bg-amber-50/60 p-4 text-sm text-amber-800">
              You haven't finished every quiz question — your score will reflect
              what you answered.
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => jumpTo(stepIdx - 1)}
              disabled={stepIdx === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              onClick={() => jumpTo(stepIdx + 1)}
              disabled={continueDisabled}
            >
              {current?.type === "intro"
                ? "Start course"
                : current?.type === "quiz" &&
                    leftoverQuiz.indexOf(data.quiz[current.index]) ===
                      leftoverQuiz.length - 1
                  ? "Finish quiz"
                  : "Continue"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IntroSplash({
  course,
  learnerName,
  lessonCount,
  scenarioCount,
  quizCount,
  onStart,
  onDownloadTranscript,
}: {
  course: CourseDetail;
  learnerName: string;
  lessonCount: number;
  scenarioCount: number;
  quizCount: number;
  onStart: () => void;
  onDownloadTranscript: () => void;
}) {
  const objectives = course.generated_json?.learningObjectives ?? [];
  return (
    <Card className="overflow-hidden">
      <CourseCover
        title={course.title}
        subtitle={course.description}
        variant="splash"
        minutes={course.estimated_minutes}
        difficulty={course.difficulty}
        language={course.language}
      />
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="text-sm text-slate-500">
            Hi {learnerName} — here's what this course covers before you start.
          </p>
        </div>

        {objectives.length > 0 && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Target className="h-4 w-4" /> What you'll learn
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Lessons" value={lessonCount} />
          <Stat label="Scenarios" value={scenarioCount} />
          <Stat label="Quiz items" value={quizCount} />
        </div>

        {course.generated_json?.limitations && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <strong className="block mb-1">Before you begin</strong>
            <ul className="list-disc space-y-0.5 pl-4">
              {course.generated_json.limitations.slice(0, 3).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={onStart} className="px-6">
            <PlayCircle className="h-5 w-5" /> Start course
          </Button>
          <Button variant="outline" onClick={onDownloadTranscript}>
            <Download className="h-4 w-4" /> Download transcript
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  courseTitle,
  check,
  checkAnswer,
  onCheckAnswer,
}: {
  lesson: CourseDetail["lessons"][number];
  courseTitle: string;
  check?: CourseDetail["quiz"][number];
  checkAnswer?: string;
  onCheckAnswer: (opt: string, qid: number) => void;
}) {
  const narration = [
    lesson.title,
    lesson.content,
    lesson.key_takeaway && `Key takeaway: ${lesson.key_takeaway}`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Card className="overflow-hidden">
      <CourseCover
        title={lesson.title}
        subtitle={`From ${courseTitle}`}
        variant="hero"
      />
      <CardHeader>
        <CardTitle>{lesson.title}</CardTitle>
        <Badge tone="brand">Lesson {lesson.order_index + 1}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <LessonAudio text={narration} />
        <p className="leading-relaxed text-slate-700">{lesson.content}</p>
        {lesson.key_takeaway && (
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
            <Lightbulb className="mr-1.5 inline h-4 w-4" />
            <strong>Key takeaway:</strong> {lesson.key_takeaway}
          </div>
        )}

        {check && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <Sparkles className="h-3.5 w-3.5" /> Knowledge check ·{" "}
              {check.topic || "Topic"}
            </div>
            <p className="text-sm font-medium text-slate-900">
              {check.question}
            </p>
            <div className="mt-2 space-y-1.5">
              {check.options.map((o) => {
                const selected = checkAnswer === o;
                const correct = checkAnswer
                  ? o === check.correct_answer
                  : false;
                return (
                  <button
                    key={o}
                    onClick={() => onCheckAnswer(o, check.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                      selected
                        ? correct
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    aria-pressed={selected}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {checkAnswer && (
              <div className="mt-2 text-xs text-slate-600">
                <strong
                  className={
                    checkAnswer === check.correct_answer
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }
                >
                  {checkAnswer === check.correct_answer
                    ? "Correct"
                    : "Not quite"}
                </strong>
                {check.explanation && <> — {check.explanation}</>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuizQuestion({
  q,
  number,
  total,
  answer,
  onAnswer,
}: {
  q: CourseDetail["quiz"][number];
  number: number;
  total: number;
  answer?: string;
  onAnswer: (a: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Final quiz {number} / {total}
        </CardTitle>
        <Badge>{q.topic}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-slate-900">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((o) => {
            const selected = answer === o;
            return (
              <button
                key={o}
                onClick={() => onAnswer(o)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  selected
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-slate-200 hover:bg-slate-50",
                )}
                aria-pressed={selected}
              >
                {o}
              </button>
            );
          })}
        </div>
        {answer && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <strong
              className={
                answer === q.correct_answer
                  ? "text-emerald-700"
                  : "text-rose-700"
              }
            >
              {answer === q.correct_answer ? "Correct" : "Not quite"}
            </strong>
            {q.explanation && <> — {q.explanation}</>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultView({
  score,
  onComplete,
  completed,
  loading,
  course,
}: {
  score: number;
  onComplete: () => void;
  completed: boolean;
  loading: boolean;
  course: CourseDetail;
}) {
  const passed = score >= 60;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Award className="mr-2 inline h-4 w-4" /> You're at the end
        </CardTitle>
        <Badge tone={passed ? "success" : "warning"}>
          {passed ? "Pass" : "Needs review"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 p-6 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Your score
          </div>
          <div className="text-5xl font-bold text-brand-700">{score}</div>
          <div
            className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(
              score >= 80 ? "low" : score >= 60 ? "medium" : "high",
            )}`}
          >
            {score >= 80 ? "Low risk" : score >= 60 ? "Medium risk" : "High risk"}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {passed
              ? "Great work — you can mark this course complete and earn a certificate."
              : "You can revisit lessons and retake the quiz any time."}
          </div>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={onComplete}
          loading={loading}
          disabled={completed}
        >
          <CheckCircle2 className="h-5 w-5" />
          {completed ? "Marked complete" : "Mark course complete"}
        </Button>
        {completed && passed && (
          <p className="text-center text-sm text-emerald-700">
            🎉 Certificate issued — check your dashboard.
          </p>
        )}
        {course.generated_json?.limitations &&
          course.generated_json.limitations.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Limitations:</strong>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {course.generated_json.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadTranscript(courseId: number, title: string) {
  const baseURL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:8000/api/v1";
  const token = localStorage.getItem("elot_token");
  fetch(`${baseURL}/learner/courses/${courseId}/transcript.txt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => {
      if (!r.ok) throw new Error("Transcript not available");
      return r.text();
    })
    .then((text) => {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => alert(`Could not download transcript: ${err.message}`));
}
