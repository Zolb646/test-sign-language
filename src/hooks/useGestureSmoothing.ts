"use client";

import { useRef, useCallback } from "react";
import { SignClassification } from "@/types/hand";

const HISTORY_SIZE = 8;
const MIN_CONSENSUS = 0.5; // 50% of history must agree

/**
 * Smooths gesture detection over time to reduce flickering.
 * Uses a sliding window of recent classifications and returns
 * the most frequent sign if it meets the consensus threshold.
 */
export function useGestureSmoothing() {
  const historyRef = useRef<SignClassification[]>([]);

  const smooth = useCallback(
    (raw: SignClassification | null): SignClassification | null => {
      if (!raw) {
        // Gradually drain history when no hand is detected
        if (historyRef.current.length > 0) {
          historyRef.current = historyRef.current.slice(1);
        }
        return historyRef.current.length > 0
          ? getMostFrequent(historyRef.current)
          : null;
      }

      // Motion-detected signs (J, Z) are high-confidence — bypass smoothing
      // to avoid the majority-vote window diluting them with static I/D frames
      if (raw.motionDetected) {
        historyRef.current = [raw];
        return raw;
      }

      historyRef.current.push(raw);
      if (historyRef.current.length > HISTORY_SIZE) {
        historyRef.current = historyRef.current.slice(-HISTORY_SIZE);
      }

      return getMostFrequent(historyRef.current);
    },
    []
  );

  const reset = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { smooth, reset };
}

function getMostFrequent(
  history: SignClassification[]
): SignClassification | null {
  if (history.length === 0) return null;

  const counts = new Map<string, { count: number; best: SignClassification }>();

  for (const entry of history) {
    const existing = counts.get(entry.letter);
    if (existing) {
      existing.count++;
      if (entry.confidence > existing.best.confidence) {
        existing.best = entry;
      }
    } else {
      counts.set(entry.letter, { count: 1, best: entry });
    }
  }

  let winner: { count: number; best: SignClassification } | null = null;
  for (const entry of counts.values()) {
    if (!winner || entry.count > winner.count) {
      winner = entry;
    }
  }

  if (!winner) return null;

  const ratio = winner.count / history.length;
  if (ratio < MIN_CONSENSUS) return null;

  // Boost confidence based on consensus ratio
  return {
    ...winner.best,
    confidence: Math.min(1, winner.best.confidence * (0.5 + ratio * 0.5)),
  };
}
