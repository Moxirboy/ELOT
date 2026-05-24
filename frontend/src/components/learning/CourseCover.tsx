import { cn, gradientFromString, glyphForTitle } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  className?: string;
  /**
   * Visual density:
   * - tile: card-thumbnail aspect (16:9)
   * - hero: lesson-top banner (5:1)
   * - splash: full intro card (2:1)
   */
  variant?: "tile" | "hero" | "splash";
  minutes?: number;
  difficulty?: string;
  language?: string;
}

const aspect: Record<NonNullable<Props["variant"]>, string> = {
  tile: "aspect-[16/9]",
  hero: "aspect-[5/1]",
  splash: "aspect-[2/1] md:aspect-[5/2]",
};

/**
 * Deterministic gradient cover for a course. Same title always renders the
 * same gradient + glyph — no external assets, no API calls.
 */
export function CourseCover({
  title,
  subtitle,
  className,
  variant = "tile",
  minutes,
  difficulty,
  language,
}: Props) {
  const { from, to, accent } = gradientFromString(title);
  const glyph = glyphForTitle(title);
  const showMeta = variant !== "tile" && (minutes || difficulty || language);

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-2xl text-white shadow-card",
        aspect[variant],
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      role="img"
      aria-label={`Cover image for ${title}`}
    >
      {/* Decorative orbs */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-2xl"
        style={{ background: accent, opacity: 0.6 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full blur-2xl"
        style={{ background: accent, opacity: 0.4 }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      {/* Glyph watermark */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute select-none opacity-30",
          variant === "tile" ? "right-3 top-2 text-5xl" : "right-6 top-4 text-7xl md:text-8xl",
        )}
      >
        {glyph}
      </span>

      <div
        className={cn(
          "relative flex h-full w-full flex-col justify-end",
          variant === "tile" ? "p-3" : "p-5 md:p-7",
        )}
      >
        <div
          className={cn(
            "font-semibold leading-tight",
            variant === "tile" ? "text-sm" : "text-2xl md:text-3xl",
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-1 text-white/85",
              variant === "tile" ? "text-[11px] line-clamp-2" : "text-sm md:text-base",
            )}
          >
            {subtitle}
          </div>
        )}
        {showMeta && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {typeof minutes === "number" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                ⏱ {minutes} min
              </span>
            )}
            {difficulty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 capitalize backdrop-blur">
                📈 {difficulty}
              </span>
            )}
            {language && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                🌐 {language}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
