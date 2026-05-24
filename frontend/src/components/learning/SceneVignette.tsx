import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  SkipForward,
  Volume2,
  VolumeX,
  ShieldAlert,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import type { CourseDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useSpeech } from "@/hooks/useSpeech";
import { Avatar } from "./Avatar";
import { riskColor, cn } from "@/lib/utils";

type Scenario = CourseDetail["scenarios"][number];

export interface AIFeedback {
  isCorrect: boolean;
  score: number;
  riskLevel: "low" | "medium" | "high";
  feedback: string;
  betterAnswer: string;
  policyReference: string;
  coachingTip: string;
}

interface Props {
  scenario: Scenario;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  feedback?: AIFeedback;
  /** Friendly first name used for the "You" character bubble. */
  learnerFirstName?: string;
}

type Stage = "intro" | "situation" | "question" | "respond" | "feedback";

/**
 * Pick a plausible character name + role from the scenario text so the vignette
 * feels populated. Cheap heuristics — good enough for a demo.
 */
function inferOtherParty(scenario: Scenario): { name: string; role: string } {
  const text = `${scenario.situation} ${scenario.question}`.toLowerCase();
  if (text.includes("customer") || text.includes("client")) {
    return { name: "Customer", role: "Customer" };
  }
  if (text.includes("vendor") || text.includes("supplier")) {
    return { name: "Vendor", role: "External vendor" };
  }
  if (text.includes("manager") || text.includes("boss") || text.includes("ceo")) {
    return { name: "Manager", role: "Your manager" };
  }
  if (text.includes("ai tool") || text.includes("chatbot")) {
    return { name: "Colleague", role: "Teammate" };
  }
  return { name: "Colleague", role: "Teammate" };
}

export function SceneVignette({
  scenario,
  value,
  onChange,
  onSubmit,
  submitting,
  feedback,
  learnerFirstName = "You",
}: Props) {
  const other = useMemo(() => inferOtherParty(scenario), [scenario]);
  const [stage, setStage] = useState<Stage>("intro");
  const [muted, setMuted] = useState(false);

  // Replay the vignette when the scenario changes
  useEffect(() => {
    setStage("intro");
  }, [scenario.id]);

  // Once feedback arrives, flip to the feedback stage automatically.
  useEffect(() => {
    if (feedback) setStage("feedback");
  }, [feedback]);

  // Narration — runs through situation + question, sentence by sentence.
  const narration = useMemo(
    () => [scenario.situation, scenario.question].filter(Boolean).join(" "),
    [scenario.situation, scenario.question],
  );
  const speech = useSpeech(narration);

  // When we move past the question stage, hush the narration.
  useEffect(() => {
    if (stage === "respond" || stage === "feedback") {
      speech.stop();
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play narration when entering the situation stage (unless muted).
  useEffect(() => {
    if (stage === "situation" && !muted && speech.supported) {
      speech.play();
    }
    if (muted) speech.stop();
  }, [stage, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const introTW = useTypewriter(
    "🎬  A scene from your workday — read carefully, then decide how you'd respond.",
    { speed: 18, enabled: stage === "intro", onDone: () => setStage("situation") },
  );

  const situationTW = useTypewriter(scenario.situation, {
    speed: 22,
    enabled: stage === "situation",
    onDone: () => setStage("question"),
  });

  const questionTW = useTypewriter(scenario.question, {
    speed: 22,
    enabled: stage === "question",
    onDone: () => setStage("respond"),
  });

  const replay = () => {
    setStage("intro");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ShieldAlert className="mr-2 inline h-4 w-4 text-rose-600" /> {scenario.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(scenario.risk_level)}`}
          >
            {scenario.risk_level} risk
          </span>
          {stage !== "respond" && stage !== "feedback" && (
            <button
              onClick={() =>
                stage === "intro"
                  ? introTW.skip()
                  : stage === "situation"
                    ? situationTW.skip()
                    : questionTW.skip()
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <SkipForward className="h-3 w-3" /> Skip
            </button>
          )}
          {speech.supported && (stage === "situation" || stage === "question") && (
            <button
              onClick={() => {
                if (muted) {
                  setMuted(false);
                  speech.play();
                } else {
                  setMuted(true);
                  speech.stop();
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              aria-label={muted ? "Unmute narration" : "Mute narration"}
            >
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {muted ? "Muted" : "Narrating"}
            </button>
          )}
          {stage !== "intro" && (
            <button
              onClick={replay}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3" /> Replay
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Intro narrator bubble */}
        <Bubble side="left" tone="narrator" name="Narrator" role="Scene">
          <span className="italic text-slate-700">
            {stage === "intro" ? introTW.visible : "🎬  A scene from your workday — read carefully, then decide how you'd respond."}
            {stage === "intro" && !introTW.done && <Caret />}
          </span>
        </Bubble>

        {/* Situation — the "other party" speaks/sets the scene */}
        {(stage === "situation" || stage === "question" || stage === "respond" || stage === "feedback") && (
          <Bubble side="left" tone="colleague" name={other.name} role={other.role} highlight={stage === "situation"}>
            <CaptionedText
              text={scenario.situation}
              visible={stage === "situation" ? situationTW.visible : scenario.situation}
              activeSentenceIndex={stage === "situation" ? speech.sentenceIndex : -1}
              done={stage !== "situation" || situationTW.done}
            />
          </Bubble>
        )}

        {/* Question — same character, second beat */}
        {(stage === "question" || stage === "respond" || stage === "feedback") && (
          <Bubble side="left" tone="colleague" name={other.name} role={other.role} highlight={stage === "question"}>
            <span className="font-medium text-slate-900">
              {stage === "question" ? questionTW.visible : scenario.question}
              {stage === "question" && !questionTW.done && <Caret />}
            </span>
          </Bubble>
        )}

        {/* Response area — appears once narration completes */}
        {(stage === "respond" || stage === "feedback") && (
          <div className="flex items-start gap-3">
            <Avatar name={learnerFirstName} variant="you" />
            <div className="flex-1 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {learnerFirstName} — your response
              </div>
              <Textarea
                rows={3}
                placeholder="Write what you'd actually say or do…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={!!feedback}
              />
              {!feedback && (
                <Button
                  onClick={onSubmit}
                  loading={submitting}
                  disabled={!value.trim()}
                  className="self-start"
                >
                  <Sparkles className="h-4 w-4" /> Get AI feedback
                </Button>
              )}
            </div>
          </div>
        )}

        {/* AI Coach feedback */}
        {feedback && stage === "feedback" && (
          <Bubble side="left" tone="coach" name="ELOT Coach" role="AI feedback" highlight>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(feedback.riskLevel)}`}
                >
                  {feedback.riskLevel} risk · score {feedback.score}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    feedback.isCorrect ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {feedback.isCorrect ? "On track" : "Needs work"}
                </span>
              </div>
              <p>{feedback.feedback}</p>
              {feedback.betterAnswer && (
                <p>
                  <strong>Better answer:</strong> {feedback.betterAnswer}
                </p>
              )}
              {feedback.policyReference && (
                <p className="text-xs text-slate-500">
                  📜 Policy: {feedback.policyReference}
                </p>
              )}
              {feedback.coachingTip && (
                <p className="inline-flex items-start gap-1 text-xs text-brand-700">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5" /> {feedback.coachingTip}
                </p>
              )}
            </div>
          </Bubble>
        )}
      </CardContent>
    </Card>
  );
}

/** Single speech bubble (Avatar + bubble + tail). */
function Bubble({
  side,
  tone,
  name,
  role,
  highlight,
  children,
}: {
  side: "left" | "right";
  tone: "narrator" | "colleague" | "coach" | "you";
  name: string;
  role: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const isLeft = side === "left";
  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-[fadeUp_240ms_ease-out]",
        isLeft ? "" : "flex-row-reverse",
      )}
    >
      <Avatar name={name} variant={tone} />
      <div className={cn("flex-1", isLeft ? "" : "flex flex-col items-end")}>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {name} <span className="text-slate-400">· {role}</span>
        </div>
        <div
          className={cn(
            "mt-1 max-w-[42rem] rounded-2xl px-4 py-3 text-sm shadow-sm transition",
            highlight
              ? "border border-brand-200 bg-white"
              : "border border-slate-100 bg-slate-50",
            isLeft ? "rounded-tl-md" : "rounded-tr-md",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Renders the text but visually highlights the sentence currently being narrated. */
function CaptionedText({
  text,
  visible,
  activeSentenceIndex,
  done,
}: {
  text: string;
  visible: string;
  activeSentenceIndex: number;
  done: boolean;
}) {
  if (!done && visible !== text) {
    return (
      <span className="text-slate-800">
        {visible}
        <Caret />
      </span>
    );
  }
  if (activeSentenceIndex < 0) return <span className="text-slate-800">{text}</span>;
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .filter(Boolean);
  return (
    <span className="text-slate-800">
      {sentences.map((s, i) => (
        <span
          key={i}
          className={cn(
            "transition-colors",
            i === activeSentenceIndex && "rounded bg-brand-100 px-0.5 text-brand-900",
          )}
        >
          {s}{" "}
        </span>
      ))}
    </span>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-brand-500" />;
}
