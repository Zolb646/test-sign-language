"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useHandLandmarker } from "@/hooks/useHandLandmarker";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import { useGestureSmoothing } from "@/hooks/useGestureSmoothing";
import { useMotionTracker } from "@/hooks/useMotionTracker";
import { useSentenceBuilder } from "@/hooks/useSentenceBuilder";
import { classifyHybrid } from "@/lib/hybridClassifier";
import { loadMLModel } from "@/lib/mlClassifier";
import { loadFingerposeClassifier } from "@/lib/fingerposeClassifier";
import { DetectionMode, Landmark, SignClassification } from "@/types/hand";
import CameraFeed from "./CameraFeed";
import DetectedSign from "./DetectedSign";
import ModeToggle from "./ModeToggle";
import SentenceBuilder from "./SentenceBuilder";
import VocabularyPanel from "./VocabularyPanel";

interface HandResult {
  landmarks: Landmark[];
  classification: SignClassification;
  handedness: string;
}

export default function HandDetector() {
  const {
    videoRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
    retryCamera,
  } = useCamera();
  const {
    isLoading,
    isReady,
    error: modelError,
    detectHands,
  } = useHandLandmarker();
  const { smooth } = useGestureSmoothing();
  const { applyMotionTracking } = useMotionTracker();
  const { sentence, processSign, addSpace, backspace, clear } =
    useSentenceBuilder();

  const [hands, setHands] = useState<HandResult[]>([]);
  const [primaryClassification, setPrimaryClassification] =
    useState<SignClassification | null>(null);
  const [mode, setMode] = useState<DetectionMode>("all");
  const [fps, setFps] = useState(0);
  const lastTimestampRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);

  // Load classifier models (fail silently, app uses rule-based fallback)
  useEffect(() => {
    loadMLModel();
    loadFingerposeClassifier();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStreaming) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          addSpace();
          break;
        case "Backspace":
          e.preventDefault();
          backspace();
          break;
        case "Escape":
          e.preventDefault();
          clear();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStreaming, addSpace, backspace, clear]);

  const onFrame = useCallback(
    (timestamp: number) => {
      if (!videoRef.current || !isReady) return;

      if (timestamp <= lastTimestampRef.current) return;
      lastTimestampRef.current = timestamp;

      // FPS counter
      frameCountRef.current++;
      if (timestamp - fpsTimerRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        fpsTimerRef.current = timestamp;
      }

      const result = detectHands(videoRef.current, timestamp);

      if (result && result.landmarks && result.landmarks.length > 0) {
        const detectedHands: HandResult[] = result.landmarks.map(
          (handLandmarks, i) => {
            const lm = handLandmarks as Landmark[];
            const staticClassification = classifyHybrid(lm, mode);
            const classification = applyMotionTracking(
              staticClassification,
              lm,
              timestamp,
            );
            const handedness =
              result.handedness?.[i]?.[0]?.categoryName || "Unknown";
            return { landmarks: lm, classification, handedness };
          },
        );

        setHands(detectedHands);

        // Use the first hand for primary classification + smoothing
        const rawClassification = detectedHands[0].classification;
        const smoothed = smooth(rawClassification);
        setPrimaryClassification(smoothed);
        processSign(smoothed);
      } else {
        setHands([]);
        const smoothed = smooth(null);
        setPrimaryClassification(smoothed);
        processSign(smoothed);
      }
    },
    [videoRef, isReady, detectHands, applyMotionTracking, smooth, processSign, mode],
  );

  useAnimationFrame(onFrame, isStreaming && isReady);

  const error = cameraError || modelError;
  const allLandmarks = hands.map((h) => h.landmarks);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      {/* Mode toggle + Controls */}
      <ModeToggle mode={mode} onModeChange={setMode} />

      <div className="flex items-center gap-4">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900">
            {isLoading ? "Loading model..." : "Start Camera"}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900">
            Stop Camera
          </button>
        )}

        {isLoading && (
          <span className="text-gray-400 text-sm animate-pulse">
            Loading hand detection model...
          </span>
        )}

        {isReady && !isStreaming && (
          <span className="text-green-400 text-sm">Model ready</span>
        )}

        {isStreaming && fps > 0 && (
          <span className="text-gray-500 text-xs font-mono">
            {fps} FPS
          </span>
        )}
      </div>

      {/* Error display with retry button */}
      {error && (
        <div className="flex flex-col items-center gap-2 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm max-w-lg text-center">
          <p>{error}</p>
          <button
            onClick={retryCamera}
            className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors">
            Retry Camera
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex items-center justify-center gap-6 m-auto">
        <CameraFeed
          videoRef={videoRef}
          allLandmarks={allLandmarks}
          isStreaming={isStreaming}
        />

        <div className="flex flex-col gap-4">
          {hands.length > 0 ? (
            hands.map((hand, i) => (
              <div key={i} className="relative">
                <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-gray-700 text-[10px] text-gray-300 rounded-full z-10">
                  {hand.handedness}
                </span>
                <DetectedSign classification={hand.classification} />
              </div>
            ))
          ) : (
            <DetectedSign classification={primaryClassification} />
          )}
        </div>
      </div>

      {/* Sentence Builder */}
      {isStreaming && (
        <SentenceBuilder
          sentence={sentence}
          onClear={clear}
          onBackspace={backspace}
          onAddSpace={addSpace}
        />
      )}

      {/* Vocabulary Reference */}
      <VocabularyPanel
        mode={mode}
        activeSign={primaryClassification?.letter ?? null}
      />

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500 max-w-lg space-y-2">
        <p>
          Show ASL hand signs to the camera. Letters (A-Z), numbers (1-10), and
          phrases supported. Use the mode toggle above to filter detection.
        </p>
        <p className="text-gray-600">
          Hold a sign steady for ~1 second to add it to the sentence. Supports
          up to 2 hands simultaneously.
        </p>
        <div className="flex justify-center gap-4 text-xs text-gray-600">
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Space</kbd> Add space</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Backspace</kbd> Delete</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> Clear all</span>
        </div>
        <p className="text-gray-700 text-xs">
          Powered by MediaPipe Hand Landmarker + fingerpose + rule-based
          classification. All processing happens locally in your browser.
        </p>
      </div>
    </div>
  );
}
