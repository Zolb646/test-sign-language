import { Landmark, HandLandmark } from "@/types/hand";
import { distance2D } from "./landmarkUtils";
import { analyzeFingerState } from "./fingerState";

/**
 * Normalizes raw MediaPipe hand landmarks into a position-invariant,
 * scale-invariant feature vector suitable for ML classification.
 *
 * Output: Float32Array of 72 features
 *   [0..62]  = 21 landmarks × 3 coords (translated + scaled)
 *   [63..67] = 5 finger state booleans (thumb, index, middle, ring, pinky)
 *   [68..71] = 4 reserved slots for motion summary features (filled externally)
 */
export function normalizeLandmarks(
  landmarks: Landmark[],
  motionFeatures?: [number, number, number, number],
): Float32Array {
  const features = new Float32Array(72);

  // Use wrist as origin
  const wrist = landmarks[HandLandmark.WRIST];

  // Scale factor: distance from wrist to middle MCP (stable reference)
  const middleMCP = landmarks[HandLandmark.MIDDLE_MCP];
  const scaleFactor = distance2D(wrist, middleMCP);

  // Avoid division by zero for degenerate cases
  const scale = scaleFactor > 0.001 ? scaleFactor : 1;

  // Translate and scale all 21 landmarks
  for (let i = 0; i < 21; i++) {
    const lm = landmarks[i];
    features[i * 3] = (lm.x - wrist.x) / scale;
    features[i * 3 + 1] = (lm.y - wrist.y) / scale;
    features[i * 3 + 2] = (lm.z - wrist.z) / scale;
  }

  // Finger state booleans
  const fingerState = analyzeFingerState(landmarks);
  features[63] = fingerState.thumb ? 1 : 0;
  features[64] = fingerState.index ? 1 : 0;
  features[65] = fingerState.middle ? 1 : 0;
  features[66] = fingerState.ring ? 1 : 0;
  features[67] = fingerState.pinky ? 1 : 0;

  // Motion summary features (set externally if available)
  if (motionFeatures) {
    features[68] = motionFeatures[0];
    features[69] = motionFeatures[1];
    features[70] = motionFeatures[2];
    features[71] = motionFeatures[3];
  }

  return features;
}
