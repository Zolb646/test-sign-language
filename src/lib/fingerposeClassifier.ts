/**
 * Fingerpose-based ASL gesture classifier.
 *
 * Uses the `fingerpose` library to classify hand landmarks into ASL letters
 * by defining finger curl + direction descriptions for each gesture.
 *
 * MediaPipe landmarks (NormalizedLandmark[]) are converted to the format
 * fingerpose expects: an array of [x, y, z] tuples.
 */
import { Landmark, FingerState, SignClassification } from "@/types/hand";
import { analyzeFingerState } from "./fingerState";

// fingerpose doesn't ship proper TS types, so we use dynamic import + any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fp: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let estimator: any = null;

const Finger = {
  Thumb: 0,
  Index: 1,
  Middle: 2,
  Ring: 3,
  Pinky: 4,
} as const;

const FingerCurl = {
  NoCurl: 0,
  HalfCurl: 1,
  FullCurl: 2,
} as const;

const FingerDirection = {
  VerticalUp: 0,
  VerticalDown: 1,
  HorizontalLeft: 2,
  HorizontalRight: 3,
  DiagonalUpLeft: 4,
  DiagonalUpRight: 5,
  DiagonalDownLeft: 6,
  DiagonalDownRight: 7,
} as const;

function defineGestures(GestureDescription: new (name: string) => {
  addCurl: (finger: number, curl: number, confidence: number) => void;
  addDirection: (finger: number, direction: number, confidence: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any[] {
  const gestures = [];

  // --- A: Fist with thumb to the side ---
  const aSign = new GestureDescription("A");
  aSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  aSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  aSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  aSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  aSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(aSign);

  // --- B: Four fingers extended, thumb curled ---
  const bSign = new GestureDescription("B");
  bSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0);
  bSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  bSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  bSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
  bSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
  bSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
  gestures.push(bSign);

  // --- C: Curved hand ---
  const cSign = new GestureDescription("C");
  cSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
  cSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
  cSign.addCurl(Finger.Middle, FingerCurl.HalfCurl, 1.0);
  cSign.addCurl(Finger.Ring, FingerCurl.HalfCurl, 1.0);
  cSign.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 1.0);
  gestures.push(cSign);

  // --- D: Index up, others curled, thumb touches middle ---
  const dSign = new GestureDescription("D");
  dSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  dSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  dSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  dSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  dSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
  gestures.push(dSign);

  // --- E: All curled, tips touching thumb ---
  const eSign = new GestureDescription("E");
  eSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
  eSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  eSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  eSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  eSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(eSign);

  // --- F: Thumb + index circle, others extended ---
  const fSign = new GestureDescription("F");
  fSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
  fSign.addCurl(Finger.Index, FingerCurl.FullCurl, 0.8);
  fSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  fSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
  fSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
  gestures.push(fSign);

  // --- I: Pinky only extended ---
  const iSign = new GestureDescription("I");
  iSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.8);
  iSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  iSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  iSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  iSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
  iSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.7);
  gestures.push(iSign);

  // --- K: Index + Middle + Thumb extended ---
  const kSign = new GestureDescription("K");
  kSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
  kSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  kSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  kSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  kSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(kSign);

  // --- L: Thumb + index L-shape ---
  const lSign = new GestureDescription("L");
  lSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  lSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  lSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  lSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  lSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  lSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
  gestures.push(lSign);

  // --- O: Thumb + index touching, all curled ---
  const oSign = new GestureDescription("O");
  oSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
  oSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
  oSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 0.8);
  oSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 0.8);
  oSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 0.8);
  gestures.push(oSign);

  // --- S: Fist with thumb over fingers ---
  const sSign = new GestureDescription("S");
  sSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
  sSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  sSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  sSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  sSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(sSign);

  // --- U: Index + Middle together, pointing up ---
  const uSign = new GestureDescription("U");
  uSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.8);
  uSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  uSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  uSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  uSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  uSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
  gestures.push(uSign);

  // --- V: Index + Middle spread ---
  const vSign = new GestureDescription("V");
  vSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.8);
  vSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  vSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  vSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  vSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(vSign);

  // --- W: Index + Middle + Ring extended ---
  const wSign = new GestureDescription("W");
  wSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.8);
  wSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  wSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
  wSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
  wSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(wSign);

  // --- Y: Thumb + Pinky extended ---
  const ySign = new GestureDescription("Y");
  ySign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  ySign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  ySign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  ySign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  ySign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
  gestures.push(ySign);

  // --- ILY (I Love You): Thumb + Index + Pinky extended ---
  const ilySign = new GestureDescription("ILY");
  ilySign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  ilySign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
  ilySign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  ilySign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  ilySign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
  gestures.push(ilySign);

  // --- GOOD (Thumbs up) ---
  const goodSign = new GestureDescription("GOOD");
  goodSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  goodSign.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 1.0);
  goodSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  goodSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  goodSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  goodSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(goodSign);

  // --- BAD (Thumbs down) ---
  const badSign = new GestureDescription("BAD");
  badSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
  badSign.addDirection(Finger.Thumb, FingerDirection.VerticalDown, 1.0);
  badSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
  badSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
  badSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
  badSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
  gestures.push(badSign);

  return gestures;
}

/**
 * Convert MediaPipe NormalizedLandmark[] to the [[x,y,z], ...] format
 * that fingerpose expects.
 */
function mediapipeToFingerpose(landmarks: Landmark[]): [number, number, number][] {
  return landmarks.map((lm) => [lm.x * 640, lm.y * 480, lm.z * 640]);
}

/**
 * Lazily initialize the fingerpose module and gesture estimator.
 */
async function ensureInitialized(): Promise<boolean> {
  if (estimator) return true;

  try {
    fp = await import("fingerpose");
    const gestures = defineGestures(fp.GestureDescription);
    estimator = new fp.GestureEstimator(gestures);
    return true;
  } catch (err) {
    console.warn("Fingerpose classifier not available:", err);
    return false;
  }
}

let initPromise: Promise<boolean> | null = null;

/**
 * Load the fingerpose classifier. Safe to call multiple times.
 */
export async function loadFingerposeClassifier(): Promise<boolean> {
  if (!initPromise) {
    initPromise = ensureInitialized();
  }
  return initPromise;
}

export function isFingerposeReady(): boolean {
  return estimator !== null;
}

const FP_PHRASE_MAP: Record<string, string> = {
  ILY: "I LOVE YOU",
  GOOD: "GOOD",
  BAD: "BAD",
};

/**
 * Classify hand landmarks using fingerpose.
 * Returns null if not initialized or no gesture detected.
 */
export function classifyWithFingerpose(
  landmarks: Landmark[],
): SignClassification | null {
  if (!estimator) return null;

  try {
    const converted = mediapipeToFingerpose(landmarks);
    const result = estimator.estimate(converted, 7.0); // min confidence score 7/10

    if (!result.gestures || result.gestures.length === 0) return null;

    // Sort by score descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = [...result.gestures].sort((a: any, b: any) => b.score - a.score);
    const best = sorted[0];

    const letter = best.name as string;
    const confidence = Math.min(1, best.score / 10); // fingerpose uses 0-10 scale
    const fingerState: FingerState = analyzeFingerState(landmarks);
    const phrase = FP_PHRASE_MAP[letter];

    const classification: SignClassification = {
      letter,
      confidence,
      fingerState,
      classifierSource: "hybrid" as const,
      ...(phrase ? { phrase } : {}),
    };

    // Add alternatives
    if (sorted.length > 1) {
      classification.alternatives = sorted.slice(1, 3).map((g: { name: string; score: number }) => ({
        letter: g.name,
        confidence: Math.min(1, g.score / 10),
      }));
    }

    return classification;
  } catch {
    return null;
  }
}
