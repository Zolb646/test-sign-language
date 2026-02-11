import { Point3D } from "@/types/hand";

export interface TrajectoryPoint {
  position: Point3D;
  timestamp: number;
}

interface TrajectoryResult {
  matched: boolean;
  confidence: number;
}

/**
 * Checks whether a pinky-tip trajectory matches the ASL "J" motion:
 * a downward arc curving to the side (like drawing a J in the air).
 */
export function matchJTrajectory(points: TrajectoryPoint[]): TrajectoryResult {
  if (points.length < 10) return { matched: false, confidence: 0 };

  const first = points[0].position;
  const last = points[points.length - 1].position;

  // Must move downward (y increases downward in MediaPipe coords)
  const dy = last.y - first.y;
  if (dy < 0.06) return { matched: false, confidence: 0 };

  // Compute path length vs straight-line distance (curvature test)
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].position.x - points[i - 1].position.x;
    const dyS = points[i].position.y - points[i - 1].position.y;
    pathLength += Math.sqrt(dx * dx + dyS * dyS);
  }

  const straightLine = Math.sqrt(
    (last.x - first.x) ** 2 + (last.y - first.y) ** 2,
  );

  if (straightLine < 0.01) return { matched: false, confidence: 0 };

  const curvatureRatio = pathLength / straightLine;

  // J has a curve — path should be longer than straight line
  if (curvatureRatio < 1.2) return { matched: false, confidence: 0 };

  // Check direction pattern: first half mostly downward, second half has sideways component
  const midIdx = Math.floor(points.length / 2);
  const mid = points[midIdx].position;

  const firstHalfDy = mid.y - first.y;
  const firstHalfDx = Math.abs(mid.x - first.x);

  const secondHalfDx = Math.abs(last.x - mid.x);

  // First half should be predominantly downward
  const firstHalfVertical = firstHalfDy > firstHalfDx * 0.8;
  // Second half should have meaningful sideways movement
  const secondHalfHasSidewaysComponent = secondHalfDx > 0.02;

  if (!firstHalfVertical || !secondHalfHasSidewaysComponent) {
    return { matched: false, confidence: 0 };
  }

  // Scale confidence based on how strong the motion is
  const motionStrength = Math.min(1, dy / 0.12);
  const curveStrength = Math.min(1, (curvatureRatio - 1.2) / 0.5);
  const confidence = 0.75 + 0.2 * (motionStrength * 0.5 + curveStrength * 0.5);

  return { matched: true, confidence: Math.min(0.95, confidence) };
}

/**
 * Checks whether an index-tip trajectory matches the ASL "Z" motion:
 * a zigzag pattern (horizontal → diagonal → horizontal) like drawing a Z.
 */
export function matchZTrajectory(points: TrajectoryPoint[]): TrajectoryResult {
  if (points.length < 12) return { matched: false, confidence: 0 };

  // Compute smoothed velocity vectors
  const velocities: Point3D[] = [];
  const smoothWindow = 3;

  for (let i = smoothWindow; i < points.length - smoothWindow; i++) {
    let vx = 0;
    let vy = 0;
    for (let j = -smoothWindow; j <= smoothWindow; j++) {
      if (i + j + 1 < points.length) {
        vx += points[i + j + 1].position.x - points[i + j].position.x;
        vy += points[i + j + 1].position.y - points[i + j].position.y;
      }
    }
    const n = smoothWindow * 2 + 1;
    velocities.push({ x: vx / n, y: vy / n, z: 0 });
  }

  if (velocities.length < 6) return { matched: false, confidence: 0 };

  // Count x-direction reversals (sign changes in vx)
  let reversals = 0;
  let prevSignX = Math.sign(velocities[0].x);
  const minVelocityThreshold = 0.001;

  for (let i = 1; i < velocities.length; i++) {
    const signX = Math.sign(velocities[i].x);
    if (
      signX !== 0 &&
      prevSignX !== 0 &&
      signX !== prevSignX &&
      Math.abs(velocities[i].x) > minVelocityThreshold
    ) {
      reversals++;
      prevSignX = signX;
    } else if (Math.abs(velocities[i].x) > minVelocityThreshold) {
      prevSignX = signX;
    }
  }

  // Z should have exactly 2 reversals (3 strokes)
  if (reversals < 1 || reversals > 4) return { matched: false, confidence: 0 };

  // Overall bounding box should show meaningful movement
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.position.x);
    maxX = Math.max(maxX, p.position.x);
    minY = Math.min(minY, p.position.y);
    maxY = Math.max(maxY, p.position.y);
  }

  const xSpan = maxX - minX;
  const ySpan = maxY - minY;

  // Z should have both horizontal and vertical extent
  if (xSpan < 0.03 || ySpan < 0.02) return { matched: false, confidence: 0 };

  // Scale confidence
  const reversalScore = reversals === 2 ? 1 : 0.7;
  const spanScore = Math.min(1, (xSpan + ySpan) / 0.15);
  const confidence = 0.75 + 0.2 * (reversalScore * 0.6 + spanScore * 0.4);

  return { matched: true, confidence: Math.min(0.95, confidence) };
}
