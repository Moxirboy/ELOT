import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function riskColor(level?: string): string {
  switch ((level ?? "").toLowerCase()) {
    case "high":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function statusColor(status?: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "not_started":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "overdue":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function prettyStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---- Deterministic visual identity ---------------------------------------
//
// Hash a string into a stable hue so two courses with the same title always
// render the same gradient cover. No API calls — pure JS.

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Pick a deterministic hue + complementary accent for a string. */
export function gradientFromString(input: string): {
  from: string;
  to: string;
  accent: string;
} {
  const h = hashString(input || "ELOT");
  const hue = h % 360;
  const accentHue = (hue + 40 + (h % 60)) % 360;
  const baseSat = 70;
  const baseLight = 56;
  return {
    from: `hsl(${hue}deg ${baseSat}% ${baseLight}%)`,
    to: `hsl(${accentHue}deg ${baseSat}% ${baseLight - 8}%)`,
    accent: `hsl(${accentHue}deg ${baseSat - 10}% ${baseLight + 14}%)`,
  };
}

const TOPIC_GLYPHS: Record<string, string> = {
  cyber: "🛡",
  privacy: "🔒",
  data: "📊",
  ai: "🤖",
  conduct: "🤝",
  onboarding: "🌱",
  harassment: "🚧",
  safety: "⚠️",
  default: "📘",
};

/** Pick a glyph for a course/lesson title by keyword. */
export function glyphForTitle(title: string): string {
  const t = title.toLowerCase();
  for (const [k, g] of Object.entries(TOPIC_GLYPHS)) {
    if (k === "default") continue;
    if (t.includes(k)) return g;
  }
  return TOPIC_GLYPHS.default;
}

/** First name from a full name. */
export function firstName(input: string | null | undefined): string {
  if (!input) return "there";
  return input.split(/\s+/)[0] ?? input;
}

