import { FingerState, Landmark, SignClassification } from "@/types/hand";
import { normalizeLandmarks } from "./landmarkNormalizer";
import { analyzeFingerState } from "./fingerState";

/**
 * Class labels the ML model is trained on.
 * Order must exactly match the training script's label encoding.
 */
export const CLASS_LABELS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "ILY",
  "GOOD",
  "BAD",
  "OK",
  "STOP",
  "HI",
  "THANK_YOU",
  "YES",
  "NO",
  "PLEASE",
  "SORRY",
  "DONE",
] as const;

const PHRASE_MAP: Record<string, string> = {
  ILY: "I LOVE YOU",
  GOOD: "GOOD",
  BAD: "BAD",
  OK: "OK",
  STOP: "STOP",
  HI: "HELLO",
  THANK_YOU: "THANK YOU",
  YES: "YES",
  NO: "NO",
  PLEASE: "PLEASE",
  SORRY: "SORRY",
  DONE: "DONE",
};

let tf: typeof import("@tensorflow/tfjs") | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
let loadPromise: Promise<void> | null = null;

/**
 * Dynamically imports TensorFlow.js and loads the ASL classifier model.
 * Safe to call multiple times — subsequent calls return the same promise.
 * Fails silently so the app falls back to rule-based classification.
 */
export async function loadMLModel(): Promise<boolean> {
  if (model) return true;

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        tf = await import("@tensorflow/tfjs");
        model = await tf.loadLayersModel("/models/asl-classifier/model.json");

        // Warm up with a dummy prediction
        const dummy = tf.zeros([1, 72]);
        const warmup = model.predict(dummy);
        if (Array.isArray(warmup)) {
          warmup.forEach((t: { dispose(): void }) => t.dispose());
        } else {
          warmup.dispose();
        }
        dummy.dispose();
      } catch (err) {
        console.warn(
          "ML classifier not available, using rule-based only:",
          err,
        );
        model = null;
      }
    })();
  }

  await loadPromise;
  return model !== null;
}

export function isMLModelLoaded(): boolean {
  return model !== null;
}

/**
 * Classifies a hand using the ML model.
 * Returns null if the model isn't loaded.
 */
export function classifyWithML(
  landmarks: Landmark[],
  motionFeatures?: [number, number, number, number],
): SignClassification | null {
  if (!model || !tf) return null;

  const features = normalizeLandmarks(landmarks, motionFeatures);
  const input = tf.tensor2d([Array.from(features)], [1, 72]);
  const rawPrediction = model.predict(input);
  const prediction = Array.isArray(rawPrediction)
    ? rawPrediction[0]
    : rawPrediction;
  const scores = prediction.dataSync() as Float32Array;
  input.dispose();
  prediction.dispose();

  // Find top prediction
  let maxIdx = 0;
  let maxScore = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > maxScore) {
      maxScore = scores[i];
      maxIdx = i;
    }
  }

  const letter = CLASS_LABELS[maxIdx];
  const fingerState: FingerState = analyzeFingerState(landmarks);
  const phrase = PHRASE_MAP[letter];

  return {
    letter,
    confidence: maxScore,
    fingerState,
    ...(phrase ? { phrase } : {}),
    classifierSource: "ml" as const,
  };
}
