"use client";

import { RefObject } from "react";
import LandmarkOverlay from "./LandmarkOverlay";
import { Landmark } from "@/types/hand";

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  allLandmarks: Landmark[][];
  isStreaming: boolean;
}

export default function CameraFeed({
  videoRef,
  allLandmarks,
  isStreaming,
}: CameraFeedProps) {
  const width = 640;
  const height = 480;

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-700"
      style={{ width, height }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
        autoPlay
      />

      {isStreaming && (
        <LandmarkOverlay
          allLandmarks={allLandmarks}
          width={width}
          height={height}
        />
      )}

      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Camera off</p>
        </div>
      )}

      {isStreaming && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-300 bg-black/50 px-2 py-0.5 rounded">
            LIVE
          </span>
          {allLandmarks.length > 0 && (
            <span className="text-xs text-green-300 bg-black/50 px-2 py-0.5 rounded">
              {allLandmarks.length} hand{allLandmarks.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
