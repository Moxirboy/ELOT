import {
  BookOpen,
  CheckCircle2,
  Circle,
  Flag,
  HelpCircle,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StepKind = "intro" | "lesson" | "scenario" | "quiz" | "result";

export interface StepDescriptor {
  kind: StepKind;
  title: string;
  /** 1-based label for the sidebar (e.g. "Lesson 2"). */
  label: string;
}

interface Props {
  steps: StepDescriptor[];
  currentIndex: number;
  /** Maximum step index that has been "reached" — gates forward jumps. */
  maxReached: number;
  onJump: (idx: number) => void;
}

const KIND_ICON: Record<StepKind, typeof BookOpen> = {
  intro: PlayCircle,
  lesson: BookOpen,
  scenario: ShieldAlert,
  quiz: HelpCircle,
  result: Flag,
};

const KIND_TONE: Record<StepKind, string> = {
  intro: "text-brand-600 bg-brand-50",
  lesson: "text-indigo-600 bg-indigo-50",
  scenario: "text-rose-600 bg-rose-50",
  quiz: "text-amber-600 bg-amber-50",
  result: "text-emerald-600 bg-emerald-50",
};

/**
 * Step sidebar (lg+) / top accordion (mobile) for the course player.
 *
 * Past steps are clickable; future steps beyond `maxReached + 1` are disabled.
 */
export function CourseSteps({ steps, currentIndex, maxReached, onJump }: Props) {
  return (
    <nav
      aria-label="Course steps"
      className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card"
    >
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Course outline
      </div>
      <ol className="space-y-1">
        {steps.map((s, idx) => {
          const Icon = KIND_ICON[s.kind];
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex || (idx === currentIndex && idx < maxReached);
          const isReachable = idx <= maxReached + 1;
          return (
            <li key={idx}>
              <button
                onClick={() => isReachable && onJump(idx)}
                disabled={!isReachable}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  isActive
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                    : isDone
                      ? "text-slate-700 hover:bg-slate-50"
                      : isReachable
                        ? "text-slate-500 hover:bg-slate-50"
                        : "cursor-not-allowed text-slate-300",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    isDone
                      ? "bg-emerald-50 text-emerald-600"
                      : isActive
                        ? KIND_TONE[s.kind]
                        : "bg-slate-50 text-slate-400",
                  )}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-wide opacity-70">
                    {s.label}
                  </span>
                  <span className="block truncate font-medium">{s.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
