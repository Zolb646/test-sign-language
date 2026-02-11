"use client";

import { useRef, useCallback } from "react";
import { Landmark, HandLandmark, SignClassification } from "@/types/hand";
import {
  TrajectoryPoint,
  matchJTrajectory,
  matchZTrajectory,
} from "@/lib/trajectoryMatcher";

const BUFFER_SIZE = 30; // ~500ms at 60fps

interface MotionBuffer {
  pinky: TrajectoryPoint[];
  index: TrajectoryPoint[];
  activeShape: string | null; // Current prerequisite shape ("I" for J, "D" for Z)
  shapeFrameCount: number; // How many consecutive frames this shape was held
}

/**
 * Tracks fingertip trajectories over time to detect motion-based
 * ASL signs (J and Z). Call `applyMotionTracking` on every frame
 * after the static classifier runs — it may upgrade I→J or D→Z
 * when a matching motion pattern is detected.
 */
export function useMotionTracker() {
  const bufferRef = useRef<MotionBuffer>({
    pinky: [],
    index: [],
    activeShape: null,
    shapeFrameCount: 0,
  });

  const applyMotionTracking = useCallback(
    (
      staticResult: SignClassification,
      landmarks: Landmark[],
      timestamp: number,
    ): SignClassification => {
      const buf = bufferRef.current;
      const letter = staticResult.letter;

      // Determine if the current static shape is a prerequisite for a motion sign
      const isJPrerequisite = letter === "I" || letter === "J";
      const isZPrerequisite = letter === "D" || letter === "Z";
      const currentShape = isJPrerequisite ? "I" : isZPrerequisite ? "D" : null;

      // Reset buffers if the hand shape changed
      if (currentShape !== buf.activeShape) {
        buf.pinky = [];
        buf.index = [];
        buf.activeShape = currentShape;
        buf.shapeFrameCount = 0;
      }

      if (!currentShape) {
        return staticResult;
      }

      buf.shapeFrameCount++;

      // Accumulate trajectory points
      const pinkyTip = landmarks[HandLandmark.PINKY_TIP];
      const indexTip = landmarks[HandLandmark.INDEX_TIP];

      if (isJPrerequisite) {
        buf.pinky.push({
          position: { x: pinkyTip.x, y: pinkyTip.y, z: pinkyTip.z },
          timestamp,
        });
        if (buf.pinky.length > BUFFER_SIZE) {
          buf.pinky = buf.pinky.slice(-BUFFER_SIZE);
        }
      }

      if (isZPrerequisite) {
        buf.index.push({
          position: { x: indexTip.x, y: indexTip.y, z: indexTip.z },
          timestamp,
        });
        if (buf.index.length > BUFFER_SIZE) {
          buf.index = buf.index.slice(-BUFFER_SIZE);
        }
      }

      // Only attempt matching after enough frames are accumulated
      if (buf.shapeFrameCount < 10) {
        return staticResult;
      }

      // Try J detection
      if (isJPrerequisite && buf.pinky.length >= 10) {
        const jResult = matchJTrajectory(buf.pinky);
        if (jResult.matched) {
          // Clear buffer after successful match to avoid re-triggering
          buf.pinky = [];
          buf.shapeFrameCount = 0;
          return {
            letter: "J",
            confidence: jResult.confidence,
            fingerState: staticResult.fingerState,
            motionDetected: true,
          };
        }
      }

      // Try Z detection
      if (isZPrerequisite && buf.index.length >= 12) {
        const zResult = matchZTrajectory(buf.index);
        if (zResult.matched) {
          buf.index = [];
          buf.shapeFrameCount = 0;
          return {
            letter: "Z",
            confidence: zResult.confidence,
            fingerState: staticResult.fingerState,
            motionDetected: true,
          };
        }
      }

      return staticResult;
    },
    [],
  );

  const reset = useCallback(() => {
    bufferRef.current = {
      pinky: [],
      index: [],
      activeShape: null,
      shapeFrameCount: 0,
    };
  }, []);

  return { applyMotionTracking, reset };
}
