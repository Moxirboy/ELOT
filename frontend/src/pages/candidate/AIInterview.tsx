import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Lightbulb,
  Send,
  Sparkles,
} from "lucide-react";
import {
  CandidatePortal,
  type InterviewQuestion,
  type InterviewSubmitResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/learning/Avatar";

type ChatTurn =
  | { role: "interviewer"; text: string; skill: string }
  | { role: "candidate"; text: string }
  | { role: "feedback"; feedback: InterviewSubmitResponse["feedback"]; skill: string };

export function AIInterview() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { candidate } = useAuth();
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [overall, setOverall] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dashboard = useQuery({
    queryKey: ["candidate-dashboard"],
    queryFn: CandidatePortal.dashboard,
  });

  const start = useMutation({
    mutationFn: () => CandidatePortal.startInterview(candidate!.id),
    onSuccess: (q) => {
      setCurrent(q);
      setHistory((h) => [
        ...h,
        { role: "interviewer", text: q.question, skill: q.skill_tested },
      ]);
    },
  });

  const submit = useMutation({
    mutationFn: (text: string) =>
      CandidatePortal.submitInterviewAnswer(candidate!.id, text),
    onSuccess: (res) => {
      setHistory((h) => [
        ...h,
        { role: "candidate", text: answer },
        {
          role: "feedback",
          feedback: res.feedback,
          skill: current?.skill_tested ?? "",
        },
      ]);
      setAnswer("");
      if (res.next_question) {
        setCurrent(res.next_question);
        setHistory((h) => [
          ...h,
          {
            role: "interviewer",
            text: res.next_question!.question,
            skill: res.next_question!.skill_tested,
          },
        ]);
      } else {
        setCurrent(null);
        setCompleted(true);
      }
    },
  });

  const finish = useMutation({
    mutationFn: () => CandidatePortal.finishInterview(candidate!.id),
    onSuccess: (summary) => {
      setOverall(summary.overall_score);
      qc.invalidateQueries({ queryKey: ["candidate-dashboard"] });
    },
  });

  // Auto-start when interview is not yet running
  useEffect(() => {
    if (!candidate) return;
    if (dashboard.isLoading || !dashboard.data) return;
    if (dashboard.data.ai_interview_status === "completed") {
      setCompleted(true);
      finish.mutate();
      return;
    }
    if (current || start.isPending || start.isSuccess) return;
    start.mutate();
  }, [candidate, dashboard.data, dashboard.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const total = current?.total_questions ?? 5;
  const progress = current
    ? Math.round((current.question_number / total) * 100)
    : completed
      ? 100
      : 0;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/candidate/dashboard")}
        className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 font-semibold uppercase tracking-wide">
              <Bot className="h-3.5 w-3.5" /> AI interview
            </span>
            <span className="rounded-full border border-white/30 bg-white/15 px-2 py-1">
              {current
                ? `Question ${current.question_number} / ${total}`
                : completed
                  ? "Completed"
                  : "Loading"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            {dashboard.data?.role.title ?? "Your interview"}
          </h1>
          <div className="mt-3">
            <Progress value={progress} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Sparkles className="mr-2 inline h-4 w-4 text-brand-600" />
            Conversation
          </CardTitle>
          {current && (
            <Badge tone="brand" className="capitalize">
              {current.skill_tested}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            ref={scrollRef}
            className="max-h-[28rem] space-y-3 overflow-y-auto pr-1"
          >
            {history.length === 0 && start.isPending && (
              <p className="text-sm text-slate-500">Loading first question…</p>
            )}
            {history.map((turn, i) =>
              turn.role === "interviewer" ? (
                <InterviewerBubble key={i} text={turn.text} skill={turn.skill} />
              ) : turn.role === "candidate" ? (
                <CandidateBubble
                  key={i}
                  text={turn.text}
                  name={candidate?.full_name ?? "You"}
                />
              ) : (
                <FeedbackBubble
                  key={i}
                  feedback={turn.feedback}
                  skill={turn.skill}
                />
              ),
            )}
            {completed && (
              <Card className="bg-emerald-50/60 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                <strong>Interview complete!</strong>
                {overall !== null && (
                  <span>
                    {" "}Your overall AI score is <strong>{overall}</strong> / 100.
                  </span>
                )}{" "}
                HR will review your scorecard and follow up with next steps.
              </Card>
            )}
          </div>

          {!completed && current && (
            <div className="border-t border-slate-100 pt-3">
              <Textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    if (answer.trim()) submit.mutate(answer);
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Tip: ⌘/Ctrl + Enter to send</span>
                <Button
                  onClick={() => submit.mutate(answer)}
                  loading={submit.isPending}
                  disabled={!answer.trim()}
                >
                  <Send className="h-4 w-4" /> Send answer
                </Button>
              </div>
            </div>
          )}

          {completed && (
            <div className="flex justify-end">
              <Button onClick={() => navigate("/candidate/dashboard")}>
                Back to dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50/60 p-3 text-xs text-amber-800">
        <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
        <strong>Reminder:</strong> ELOT AI's recommendations are for HR review
        only. The final hiring decision is always made by a human.
      </Card>
    </div>
  );
}

function InterviewerBubble({ text, skill }: { text: string; skill: string }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name="AI Interviewer" variant="coach" />
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          AI Interviewer · {skill}
        </div>
        <div className="mt-1 max-w-2xl rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {text}
        </div>
      </div>
    </div>
  );
}

function CandidateBubble({ text, name }: { text: string; name: string }) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <Avatar name={name} variant="you" />
      <div className="flex max-w-2xl flex-col items-end">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          {name}
        </div>
        <div className="mt-1 rounded-2xl rounded-tr-md bg-brand-600 px-3 py-2 text-sm text-white">
          {text}
        </div>
      </div>
    </div>
  );
}

function FeedbackBubble({
  feedback,
  skill,
}: {
  feedback: InterviewSubmitResponse["feedback"];
  skill: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name="Notes" variant="narrator" />
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          AI notes · {skill} · score {feedback.score}
        </div>
        <div
          className={cn(
            "mt-1 max-w-2xl rounded-2xl rounded-tl-md border px-3 py-2 text-xs",
            feedback.score >= 75
              ? "border-emerald-100 bg-emerald-50 text-emerald-900"
              : feedback.score >= 50
                ? "border-amber-100 bg-amber-50 text-amber-900"
                : "border-rose-100 bg-rose-50 text-rose-900",
          )}
        >
          {feedback.hrReviewNote || feedback.betterAnswerExample}
          {feedback.strengths.length > 0 && (
            <div className="mt-1 text-[11px]">
              <strong>Strengths:</strong> {feedback.strengths.join(", ")}
            </div>
          )}
          {feedback.weaknesses.length > 0 && (
            <div className="mt-0.5 text-[11px]">
              <strong>Could improve:</strong> {feedback.weaknesses.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
