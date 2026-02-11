"use client";

import { useRef, useEffect } from "react";

export function useAnimationFrame(
  callback: (timestamp: number) => void,
  enabled: boolean
): void {
  const callbackRef = useRef(callback);
  const rafRef = useRef<number | null>(null);

  // Always keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    function loop(timestamp: number) {
      callbackRef.current(timestamp);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled]);
}
