"use client";

import { useRef, useEffect } from "react";
import { Landmark, HAND_CONNECTIONS } from "@/types/hand";

interface LandmarkOverlayProps {
  allLandmarks: Landmark[][];
  width: number;
  height: number;
}

const HAND_COLORS = [
  { line: "#00FF00", dot: "#FF0000" }, // Hand 1: green lines, red dots
  { line: "#00CCFF", dot: "#FF8800" }, // Hand 2: cyan lines, orange dots
];

export default function LandmarkOverlay({
  allLandmarks,
  width,
  height,
}: LandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!allLandmarks || allLandmarks.length === 0) return;

    for (let h = 0; h < allLandmarks.length; h++) {
      const landmarks = allLandmarks[h];
      if (!landmarks || landmarks.length === 0) continue;

      const colors = HAND_COLORS[h % HAND_COLORS.length];

      // Draw connections
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;

      for (const [start, end] of HAND_CONNECTIONS) {
        const a = landmarks[start];
        const b = landmarks[end];

        ctx.beginPath();
        ctx.moveTo((1 - a.x) * width, a.y * height);
        ctx.lineTo((1 - b.x) * width, b.y * height);
        ctx.stroke();
      }

      // Draw landmark points
      ctx.fillStyle = colors.dot;
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc((1 - point.x) * width, point.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [allLandmarks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
}
