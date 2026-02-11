"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useHandLandmarker } from "@/hooks/useHandLandmarker";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import { Landmark } from "@/types/hand";
import { normalizeLandmarks } from "@/lib/landmarkNormalizer";
import { CLASS_LABELS } from "@/lib/mlClassifier";

interface CollectedSample {
  label: string;
  features: number[];
  timestamp: number;
}

const FRAMES_PER_SIGN = 30;

export default function CollectPage() {
  const { videoRef, isStreaming, startCamera, stopCamera } = useCamera();
  const { isLoading, isReady, detectHands } = useHandLandmarker();

  const [currentLabelIdx, setCurrentLabelIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [framesCollected, setFramesCollected] = useState(0);
  const [samples, setSamples] = useState<CollectedSample[]>([]);
  const [status, setStatus] = useState("");
  const [sampleCount, setSampleCount] = useState(0);

  const recordingRef = useRef(false);
  const framesRef = useRef(0);
  const samplesRef = useRef<CollectedSample[]>([]);
  const lastTimestampRef = useRef(0);

  const currentLabel = CLASS_LABELS[currentLabelIdx];

  const onFrame = useCallback(
    (timestamp: number) => {
      if (!videoRef.current || !isReady) return;
      if (timestamp <= lastTimestampRef.current) return;
      lastTimestampRef.current = timestamp;

      if (!recordingRef.current) return;

      const result = detectHands(videoRef.current, timestamp);
      if (!result?.landmarks?.length) return;

      const lm = result.landmarks[0] as Landmark[];
      const features = normalizeLandmarks(lm);

      samplesRef.current.push({
        label: CLASS_LABELS[currentLabelIdx],
        features: Array.from(features),
        timestamp,
      });

      framesRef.current++;
      setFramesCollected(framesRef.current);

      if (framesRef.current >= FRAMES_PER_SIGN) {
        recordingRef.current = false;
        setIsRecording(false);
        setSamples([...samplesRef.current]);
        setSampleCount(samplesRef.current.length);
        setStatus(
          `Captured ${FRAMES_PER_SIGN} frames for "${CLASS_LABELS[currentLabelIdx]}"`,
        );
      }
    },
    [videoRef, isReady, detectHands, currentLabelIdx],
  );

  useAnimationFrame(onFrame, isStreaming && isReady);

  const startRecording = useCallback(() => {
    framesRef.current = 0;
    setFramesCollected(0);
    recordingRef.current = true;
    setIsRecording(true);
    setStatus(`Recording "${currentLabel}"... Hold the sign steady!`);
  }, [currentLabel]);

  const nextSign = useCallback(() => {
    setCurrentLabelIdx((i) => Math.min(i + 1, CLASS_LABELS.length - 1));
    setFramesCollected(0);
    setStatus("");
  }, []);

  const prevSign = useCallback(() => {
    setCurrentLabelIdx((i) => Math.max(i - 1, 0));
    setFramesCollected(0);
    setStatus("");
  }, []);

  const exportData = useCallback(() => {
    const json = JSON.stringify(samplesRef.current, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asl-training-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${samplesRef.current.length} samples`);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " && !isRecording) {
        e.preventDefault();
        startRecording();
      }
      if (e.key === "ArrowRight") nextSign();
      if (e.key === "ArrowLeft") prevSign();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRecording, startRecording, nextSign, prevSign]);

  const sampleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of samples) {
      counts.set(s.label, (counts.get(s.label) || 0) + 1);
    }
    return counts;
  }, [samples]);

  return (
    <main className="flex flex-col items-center gap-6 px-4 py-12 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Training Data Collection</h1>
        <p className="mt-2 text-gray-400 text-sm">
          Show each sign to the camera and press Space to record{" "}
          {FRAMES_PER_SIGN} frames. Use arrow keys to navigate signs.
        </p>
      </div>

      {/* Camera controls */}
      <div className="flex gap-3">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isLoading ? "Loading..." : "Start Camera"}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Stop Camera
          </button>
        )}
      </div>

      {/* Current sign prompt */}
      <div className="flex items-center gap-6">
        <button
          onClick={prevSign}
          disabled={currentLabelIdx === 0}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-sm"
        >
          Prev
        </button>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Sign {currentLabelIdx + 1} of {CLASS_LABELS.length}
          </p>
          <p className="text-6xl font-bold mt-1">{currentLabel}</p>
        </div>

        <button
          onClick={nextSign}
          disabled={currentLabelIdx === CLASS_LABELS.length - 1}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-sm"
        >
          Next
        </button>
      </div>

      {/* Video feed */}
      {isStreaming && (
        <div className="relative rounded-xl overflow-hidden border border-gray-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-[480px] h-[360px] object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {isRecording && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-red-600 rounded-full text-sm font-medium animate-pulse">
              REC {framesCollected}/{FRAMES_PER_SIGN}
            </div>
          )}
        </div>
      )}

      {/* Record button */}
      {isStreaming && isReady && (
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-xl transition-colors"
        >
          {isRecording
            ? `Recording... ${framesCollected}/${FRAMES_PER_SIGN}`
            : `Record "${currentLabel}" (Space)`}
        </button>
      )}

      {/* Status */}
      {status && (
        <p className="text-sm text-gray-300 bg-gray-800 px-4 py-2 rounded-lg">
          {status}
        </p>
      )}

      {/* Collection progress */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Total samples: {sampleCount}
          </span>
          <button
            onClick={exportData}
            disabled={sampleCount === 0}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            Export JSON
          </button>
        </div>

        {/* Per-sign sample counts */}
        <div className="flex flex-wrap gap-1.5">
          {CLASS_LABELS.map((label) => {
            const count = sampleCounts.get(label) || 0;
            return (
              <div
                key={label}
                className={`px-2 py-1 rounded text-xs font-mono ${
                  count > 0
                    ? "bg-green-900/50 text-green-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {label}: {count}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
