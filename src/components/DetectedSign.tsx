"use client";

import { SignClassification } from "@/types/hand";

interface DetectedSignProps {
  classification: SignClassification | null;
}

const FINGER_LABELS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;

export default function DetectedSign({ classification }: DetectedSignProps) {
  if (!classification) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gray-800/50 border border-gray-700 min-w-[280px]">
        <p className="text-gray-400 text-lg">
          Show your hand to start detecting
        </p>
      </div>
    );
  }

  const { letter, confidence, fingerState, phrase, category, motionDetected, alternatives } = classification;
  const isPhrase = !!phrase;
  const fingers = [
    fingerState.thumb,
    fingerState.index,
    fingerState.middle,
    fingerState.ring,
    fingerState.pinky,
  ];

  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidence >= 0.8
      ? "bg-green-500"
      : confidence >= 0.6
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div
      className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-800/50 border border-gray-700 min-w-[280px]"
      role="status"
      aria-live="polite">
      {/* Big letter or phrase */}
      <div className="flex flex-col items-center">
        {isPhrase ? (
          <>
            <span className="text-3xl font-bold text-blue-400 tracking-wide text-center">
              {phrase}
            </span>
            <span className="text-xs text-blue-500/70 mt-1">Phrase</span>
          </>
        ) : (
          <span className="text-8xl font-bold text-white tracking-wider">
            {letter}
          </span>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-400">Detected Sign</span>
          {category === "number" && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-400 rounded">
              Number
            </span>
          )}
          {motionDetected && (
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 text-cyan-400 rounded">
              Motion
            </span>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="w-full">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Confidence</span>
          <span className="text-white font-medium">{confidencePercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${confidenceColor}`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Finger state indicators */}
      <div className="w-full">
        <span className="text-sm text-gray-400 block mb-2">Finger State</span>
        <div className="flex justify-between gap-2">
          {FINGER_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  fingers[i]
                    ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50"
                    : "bg-gray-700 text-gray-500"
                }`}>
                {fingers[i] ? "E" : "C"}
              </div>
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alternatives (shown when classifier is uncertain) */}
      {alternatives && alternatives.length > 0 && confidence < 0.8 && (
        <div className="w-full">
          <span className="text-xs text-gray-500">
            Also possible:{" "}
            {alternatives.map((alt) => (
              <span key={alt.letter} className="text-gray-400">
                {alt.letter} ({Math.round(alt.confidence * 100)}%)
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
