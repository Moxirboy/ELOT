import { useEffect, useRef, useState } from "react";

interface Options {
  speed?: number; // ms per char
  enabled?: boolean;
  onDone?: () => void;
}

/**
 * Progressively reveal `text` one character at a time.
 *
 * Returns the visible substring, whether the animation is still running,
 * and a `skip()` function the caller can wire to a "Skip" button.
 */
export function useTypewriter(text: string, opts: Options = {}): {
  visible: string;
  done: boolean;
  skip: () => void;
} {
  const { speed = 22, enabled = true, onDone } = opts;
  const [visible, setVisible] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(text);
      setDone(true);
      return;
    }

    setVisible("");
    setDone(false);
    indexRef.current = 0;
    doneRef.current = false;

    timerRef.current = window.setInterval(() => {
      indexRef.current += 1;
      const next = text.slice(0, indexRef.current);
      setVisible(next);
      if (indexRef.current >= text.length) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setDone(true);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, enabled]);

  function skip() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setVisible(text);
    setDone(true);
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  }

  return { visible, done, skip };
}
