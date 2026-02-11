import { FingerState, HandLandmark, Landmark } from "@/types/hand";
import { distance2D, angleBetweenDeg } from "./landmarkUtils";

// Determine if a finger is extended based on joint angles and tip position
function isFingerExtended(
  landmarks: Landmark[],
  mcp: number,
  pip: number,
  dip: number,
  tip: number
): boolean {
  // Check the angle at PIP joint — extended fingers have straighter angles
  const pipAngle = angleBetweenDeg(landmarks[mcp], landmarks[pip], landmarks[dip]);
  const dipAngle = angleBetweenDeg(landmarks[pip], landmarks[dip], landmarks[tip]);

  // Extended: PIP angle > 150° and DIP angle > 150°
  // Curled: angles are much smaller
  if (pipAngle > 150 && dipAngle > 150) return true;
  if (pipAngle < 100) return false;

  // Fallback: check if tip is farther from wrist than PIP
  const tipToWrist = distance2D(landmarks[tip], landmarks[HandLandmark.WRIST]);
  const pipToWrist = distance2D(landmarks[pip], landmarks[HandLandmark.WRIST]);
  return tipToWrist > pipToWrist;
}

function isThumbExtended(landmarks: Landmark[]): boolean {
  const thumbTip = landmarks[HandLandmark.THUMB_TIP];
  const thumbIP = landmarks[HandLandmark.THUMB_IP];
  const thumbMCP = landmarks[HandLandmark.THUMB_MCP];
  const indexMCP = landmarks[HandLandmark.INDEX_MCP];

  // Check if thumb tip is far from palm center (approximated by index MCP)
  const tipToIndex = distance2D(thumbTip, indexMCP);
  const mcpToIndex = distance2D(thumbMCP, indexMCP);

  // Also check the angle at thumb IP joint
  const ipAngle = angleBetweenDeg(
    landmarks[HandLandmark.THUMB_MCP],
    thumbIP,
    thumbTip
  );

  // Thumb is extended if it's sticking out and relatively straight
  if (ipAngle > 140 && tipToIndex > mcpToIndex * 0.8) return true;
  if (tipToIndex < mcpToIndex * 0.5) return false;

  return tipToIndex > mcpToIndex;
}

export function analyzeFingerState(landmarks: Landmark[]): FingerState {
  return {
    thumb: isThumbExtended(landmarks),
    index: isFingerExtended(
      landmarks,
      HandLandmark.INDEX_MCP,
      HandLandmark.INDEX_PIP,
      HandLandmark.INDEX_DIP,
      HandLandmark.INDEX_TIP
    ),
    middle: isFingerExtended(
      landmarks,
      HandLandmark.MIDDLE_MCP,
      HandLandmark.MIDDLE_PIP,
      HandLandmark.MIDDLE_DIP,
      HandLandmark.MIDDLE_TIP
    ),
    ring: isFingerExtended(
      landmarks,
      HandLandmark.RING_MCP,
      HandLandmark.RING_PIP,
      HandLandmark.RING_DIP,
      HandLandmark.RING_TIP
    ),
    pinky: isFingerExtended(
      landmarks,
      HandLandmark.PINKY_MCP,
      HandLandmark.PINKY_PIP,
      HandLandmark.PINKY_DIP,
      HandLandmark.PINKY_TIP
    ),
  };
}
