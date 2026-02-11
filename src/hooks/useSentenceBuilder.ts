"use client";

import { useState, useRef, useCallback } from "react";
import { SignClassification } from "@/types/hand";

const HOLD_DURATION_MS = 800; // Must hold a sign for 800ms to add it

export function useSentenceBuilder() {
  const [sentence, setSentence] = useState("");
  const lastAddedRef = useRef<string | null>(null);
  const holdStartRef = useRef<{ letter: string; time: number } | null>(null);

  const processSign = useCallback(
    (classification: SignClassification | null) => {
      if (!classification || classification.confidence < 0.6) {
        // No confident sign — reset hold tracking and allow same letter again
        holdStartRef.current = null;
        lastAddedRef.current = null;
        return;
      }

      const { letter } = classification;
      const now = Date.now();

      // If holding a new letter, start tracking
      if (!holdStartRef.current || holdStartRef.current.letter !== letter) {
        holdStartRef.current = { letter, time: now };
        return;
      }

      // Check if held long enough
      const elapsed = now - holdStartRef.current.time;
      if (elapsed >= HOLD_DURATION_MS) {
        // Only add if it's different from the last added sign
        if (lastAddedRef.current !== letter) {
          // If it's a phrase gesture, add as a whole word with spacing
          const text = classification.phrase ?? letter;
          if (classification.phrase) {
            setSentence((prev) => {
              const needsSpace = prev.length > 0 && !prev.endsWith(" ");
              return prev + (needsSpace ? " " : "") + text;
            });
          } else {
            setSentence((prev) => prev + text);
          }
          lastAddedRef.current = letter;
        }
        // Reset hold so user must release and re-hold for duplicates
        holdStartRef.current = null;
      }
    },
    []
  );

  const addSpace = useCallback(() => {
    setSentence((prev) => (prev.length > 0 ? prev + " " : prev));
    lastAddedRef.current = null;
  }, []);

  const backspace = useCallback(() => {
    setSentence((prev) => prev.slice(0, -1));
    lastAddedRef.current = null;
  }, []);

  const addPhrase = useCallback((phrase: string) => {
    setSentence((prev) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(" ");
      return prev + (needsSpace ? " " : "") + phrase;
    });
    lastAddedRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setSentence("");
    lastAddedRef.current = null;
    holdStartRef.current = null;
  }, []);

  return { sentence, processSign, addSpace, backspace, addPhrase, clear };
}
