import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechState {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  /** Index of the currently highlighted sentence in `sentences`. -1 if idle. */
  sentenceIndex: number;
  sentences: string[];
  voices: SpeechSynthesisVoice[];
  voiceURI: string | null;
}

interface SpeechAPI extends SpeechState {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voiceURI: string) => void;
}

const VOICE_PREF_KEY = "elot:voiceURI";

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices() ?? [];
}

/**
 * Browser TTS wrapper. Surface area: sentence-by-sentence narration with
 * synchronized caption index + voice selection persisted in localStorage.
 */
export function useSpeech(text: string): SpeechAPI {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const sentences = splitSentences(text);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(VOICE_PREF_KEY),
  );
  const cancelledRef = useRef(false);

  // Voices populate asynchronously in most browsers (Chrome).
  useEffect(() => {
    if (!supported) return;
    const sync = () => {
      const list = loadVoices();
      setVoices(list);
      if (!voiceURI && list.length) {
        // Prefer high-quality English neural voices when present.
        const preferred =
          list.find((v) => /Google US English/i.test(v.name)) ||
          list.find((v) => /Microsoft/i.test(v.name) && /Neural/i.test(v.name)) ||
          list.find((v) => v.lang?.toLowerCase().startsWith("en"));
        if (preferred) setVoiceURIState(preferred.voiceURI);
      }
    };
    sync();
    window.speechSynthesis.addEventListener?.("voiceschanged", sync);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", sync);
    };
  }, [supported, voiceURI]);

  const stop = useCallback(() => {
    if (!supported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setSentenceIndex(-1);
  }, [supported]);

  const speakSentence = useCallback(
    (idx: number) => {
      if (!supported) return;
      if (idx >= sentences.length) {
        setSpeaking(false);
        setPaused(false);
        setSentenceIndex(-1);
        return;
      }
      setSentenceIndex(idx);
      const utt = new SpeechSynthesisUtterance(sentences[idx]);
      utt.rate = 1;
      utt.pitch = 1;
      utt.volume = 1;
      const v = voices.find((vc) => vc.voiceURI === voiceURI);
      if (v) {
        utt.voice = v;
        utt.lang = v.lang;
      }
      utt.onend = () => {
        if (cancelledRef.current) return;
        speakSentence(idx + 1);
      };
      utt.onerror = () => {
        setSpeaking(false);
        setPaused(false);
        setSentenceIndex(-1);
      };
      window.speechSynthesis.speak(utt);
    },
    [sentences, supported, voices, voiceURI],
  );

  const play = useCallback(() => {
    if (!supported || sentences.length === 0) return;
    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setSpeaking(true);
    setPaused(false);
    speakSentence(0);
  }, [sentences.length, speakSentence, supported]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  const setVoice = useCallback((uri: string) => {
    setVoiceURIState(uri);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOICE_PREF_KEY, uri);
    }
  }, []);

  // Stop narration on unmount or when the source text changes.
  useEffect(() => {
    return () => {
      if (supported) {
        cancelledRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, [supported, text]);

  return {
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
  };
}
