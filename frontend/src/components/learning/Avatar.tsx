import { cn } from "@/lib/utils";

interface Props {
  name: string;
  variant?: "neutral" | "colleague" | "coach" | "you" | "narrator";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variants: Record<NonNullable<Props["variant"]>, string> = {
  neutral: "from-slate-400 to-slate-600",
  colleague: "from-amber-400 to-orange-500",
  coach: "from-emerald-400 to-teal-500",
  you: "from-brand-500 to-accent-500",
  narrator: "from-slate-700 to-slate-900",
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, variant = "neutral", size = "md", className }: Props) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white",
        variants[variant],
        sizes[size],
        className,
      )}
      aria-label={`${name} avatar`}
    >
      {initials || "?"}
    </div>
  );
}
