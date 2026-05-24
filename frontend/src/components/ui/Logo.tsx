import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 64"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="elotMark" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="0.52" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <filter id="elotShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect width="64" height="64" rx="18" fill="#0f172a" />
        <path
          d="M32 10 49 17v14.5c0 11.1-7.4 19.1-17 22.5-9.6-3.4-17-11.4-17-22.5V17l17-7Z"
          fill="url(#elotMark)"
          filter="url(#elotShadow)"
        />
        <path
          d="M23 31.5 29.2 38 42 25"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M21 20.5h15"
          fill="none"
          stroke="#c4b5fd"
          strokeLinecap="round"
          strokeWidth="3"
          opacity="0.9"
        />
      </svg>
      {showText && (
        <span className="font-semibold text-slate-950">
          ELOT<span className="text-brand-600"> AI</span>
        </span>
      )}
    </div>
  );
}
