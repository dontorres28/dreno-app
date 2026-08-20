import { useEffect, useRef, useState, useCallback } from 'react';

interface TypewriterResult {
  displayText: string;
  isDone: boolean;
  skip: () => void;
}

const REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function charDelay(char: string, prevChar: string): number {
  // Pause after sentence-ending punctuation or line breaks
  if (char === '\n' || prevChar === '.' || prevChar === '!' || prevChar === '?') return 180 + Math.random() * 80;
  // Slightly longer after commas
  if (prevChar === ',') return 60 + Math.random() * 30;
  // Base speed with human-like jitter
  const base = 28;
  const jitter = (Math.random() - 0.5) * 22;
  // Occasional micro-burst (fast) or micro-pause (slow)
  const burst = Math.random() < 0.12 ? -15 : Math.random() < 0.08 ? 35 : 0;
  return Math.max(12, base + jitter + burst);
}

export function useTypewriter(text: string, shouldAnimate: boolean): TypewriterResult {
  const [displayText, setDisplayText] = useState(shouldAnimate && !REDUCED_MOTION ? '' : text);
  const [isDone, setIsDone] = useState(!shouldAnimate || REDUCED_MOTION);
  const skipRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skip = useCallback(() => {
    skipRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayText(text);
    setIsDone(true);
  }, [text]);

  useEffect(() => {
    if (!shouldAnimate || REDUCED_MOTION) {
      setDisplayText(text);
      setIsDone(true);
      return;
    }

    skipRef.current = false;
    setDisplayText('');
    setIsDone(false);

    let i = 0;

    // Scale total duration by length; clamp 1s–3s
    const wordCount = text.trim().split(/\s+/).length;
    // ~40ms/char is the base; we scale to target the word-based duration
    // but the actual timing comes from charDelay — this is just an initial delay
    const initialDelay = 120; // brief pause before first character

    function typeNext() {
      if (skipRef.current) return;
      if (i >= text.length) {
        setIsDone(true);
        return;
      }
      const char = text[i];
      const prev = i > 0 ? text[i - 1] : '';
      i++;
      setDisplayText(text.slice(0, i));
      timerRef.current = setTimeout(typeNext, charDelay(char, prev));
    }

    timerRef.current = setTimeout(typeNext, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, shouldAnimate]);

  return { displayText, isDone, skip };
}
