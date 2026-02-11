// MediaPipe hand landmark indices
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_MCP = 5,
  INDEX_PIP = 6,
  INDEX_DIP = 7,
  INDEX_TIP = 8,
  MIDDLE_MCP = 9,
  MIDDLE_PIP = 10,
  MIDDLE_DIP = 11,
  MIDDLE_TIP = 12,
  RING_MCP = 13,
  RING_PIP = 14,
  RING_DIP = 15,
  RING_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type Landmark = Point3D;

export interface FingerState {
  thumb: boolean; // true = extended
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export interface HandAnalysis {
  fingerState: FingerState;
  landmarks: Landmark[];
  handedness: "Left" | "Right";
}

export type SignCategory = "letter" | "number" | "phrase" | "word";
export type DetectionMode = "all" | "letters" | "numbers" | "words";

export interface SignClassification {
  letter: string;
  confidence: number; // 0-1
  fingerState: FingerState;
  phrase?: string; // whole-word gesture (e.g. "I LOVE YOU")
  motionDetected?: boolean; // true when sign was identified via motion tracking
  classifierSource?: "rule" | "ml" | "hybrid";
  category?: SignCategory;
  alternatives?: Array<{ letter: string; confidence: number }>;
}

// Connection pairs for drawing hand skeleton
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [5, 9],
  [9, 13],
  [13, 17], // Palm
];
