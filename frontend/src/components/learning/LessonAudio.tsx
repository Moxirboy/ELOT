import { useMemo, useState } from "react";
import { Pause, Play, Square, Volume2, Settings } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

/**
 * Inline audio player for lesson narration. Browser TTS only — silently
 * degrades when SpeechSynthesis is unavailable.
 */
export function LessonAudio({ text, className }: Props) {
  const {
    supported,
    speaking,
    paused,
    sentenceIndex,
    sentences,
    voices,
    voiceURI,
    play,
    pause,
    resume,
    stop,
    setVoice,
  } = useSpeech(text);

  const [pickerOpen, setPickerOpen] = useState(false);

  // English voices first, then other languages, alphabetised.
  const orderedVoices = useMemo(() => {
    return [...voices].sort((a, b) => {
      const aEn = a.lang?.toLowerCase().startsWith("en") ? 0 : 1;
      const bEn = b.lang?.toLowerCase().startsWith("en") ? 0 : 1;
      if (aEn !== bEn) return aEn - bEn;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  const activeVoice = orderedVoices.find((v) => v.voiceURI === voiceURI);

  if (!supported) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-100 bg-brand-50/50 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!speaking && (
            <button
              onClick={play}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-3 text-xs font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Listen to this lesson
            </button>
          )}
          {speaking && !paused && (
            <button
              onClick={pause}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 shadow-sm hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {speaking && paused && (
            <button
              onClick={resume}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-3 text-xs font-medium text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Resume
            </button>
          )}
          {speaking && (
            <button
              onClick={stop}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-brand-600">
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3 w-3" /> Captions live
          </span>
          <div className="relative">
            <button
              onClick={() => setPickerOpen((p) => !p)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-100 bg-white px-2 text-[11px] font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              aria-label="Choose narration voice"
            >
              <Settings className="h-3 w-3" />
              {activeVoice?.name?.split(" (")[0] ?? "Default voice"}
            </button>
            {pickerOpen && (
              <ul
                role="listbox"
                className="absolute right-0 top-9 z-20 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg"
              >
                {orderedVoices.length === 0 && (
                  <li className="px-2 py-1.5 text-slate-500">
                    Browser hasn't loaded any voices.
                  </li>
                )}
                {orderedVoices.map((v) => (
                  <li key={v.voiceURI}>
                    <button
                      role="option"
                      aria-selected={voiceURI === v.voiceURI}
                      onClick={() => {
                        setVoice(v.voiceURI);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-slate-700 hover:bg-brand-50",
                        voiceURI === v.voiceURI && "bg-brand-50 text-brand-700",
                      )}
                    >
                      <span className="truncate">{v.name}</span>
                      <span className="text-[10px] uppercase text-slate-400">
                        {v.lang}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Live caption strip — exposed to assistive tech via aria-live */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={cn(
          "mt-2 transition-all",
          speaking && sentenceIndex >= 0 && sentences[sentenceIndex]
            ? "opacity-100"
            : "h-0 opacity-0",
        )}
      >
        {speaking && sentenceIndex >= 0 && sentences[sentenceIndex] && (
          <div className="rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-brand-100">
            <span className="mr-2 inline-block rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              CC
            </span>
            {sentences[sentenceIndex]}
          </div>
        )}
      </div>
    </div>
  );
}
