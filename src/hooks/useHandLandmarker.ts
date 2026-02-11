"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { getHandLandmarker, disposeHandLandmarker } from "@/lib/mediapipe";

interface UseHandLandmarkerReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  detectHands: (video: HTMLVideoElement, timestamp: number) => HandLandmarkerResult | null;
}

export function useHandLandmarker(): UseHandLandmarkerReturn {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        const landmarker = await getHandLandmarker();
        if (!cancelled) {
          landmarkerRef.current = landmarker;
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Failed to load hand detection model: ${err.message}`
              : "Failed to load hand detection model"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      disposeHandLandmarker();
      landmarkerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const detectHands = useCallback(
    (video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null => {
      if (!landmarkerRef.current || video.readyState < 2) return null;
      try {
        return landmarkerRef.current.detectForVideo(video, timestamp);
      } catch {
        return null;
      }
    },
    []
  );

  return { isLoading, isReady, error, detectHands };
}
