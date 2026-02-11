import {
  DetectionMode,
  FingerState,
  HandLandmark,
  Landmark,
  SignClassification,
} from "@/types/hand";
import { distance2D, angleBetweenDeg } from "./landmarkUtils";
import { analyzeFingerState } from "./fingerState";

interface FingerPattern {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
}

function matchesPattern(state: FingerState, pattern: FingerPattern): boolean {
  if (pattern.thumb !== undefined && state.thumb !== pattern.thumb)
    return false;
  if (pattern.index !== undefined && state.index !== pattern.index)
    return false;
  if (pattern.middle !== undefined && state.middle !== pattern.middle)
    return false;
  if (pattern.ring !== undefined && state.ring !== pattern.ring) return false;
  if (pattern.pinky !== undefined && state.pinky !== pattern.pinky)
    return false;
  return true;
}

function countExtended(state: FingerState): number {
  return [
    state.thumb,
    state.index,
    state.middle,
    state.ring,
    state.pinky,
  ].filter(Boolean).length;
}

/** Returns true when fingertips point downward (below wrist). */
function isFingertipsBelow(wrist: Landmark, tip: Landmark): boolean {
  // In MediaPipe normalised coords y increases downward
  return tip.y > wrist.y + 0.05;
}

export function classifyASLSign(
  landmarks: Landmark[],
  mode: DetectionMode = "all",
): SignClassification {
  const fingerState = analyzeFingerState(landmarks);
  const extended = countExtended(fingerState);

  // ---- Landmark shortcuts ----
  const wrist = landmarks[HandLandmark.WRIST];
  const thumbTip = landmarks[HandLandmark.THUMB_TIP];
  const indexTip = landmarks[HandLandmark.INDEX_TIP];
  const indexMCP = landmarks[HandLandmark.INDEX_MCP];
  const indexPIP = landmarks[HandLandmark.INDEX_PIP];
  const indexDIP = landmarks[HandLandmark.INDEX_DIP];
  const middleTip = landmarks[HandLandmark.MIDDLE_TIP];
  const middleMCP = landmarks[HandLandmark.MIDDLE_MCP];
  const middlePIP = landmarks[HandLandmark.MIDDLE_PIP];
  const ringTip = landmarks[HandLandmark.RING_TIP];
  const ringMCP = landmarks[HandLandmark.RING_MCP];
  const pinkyTip = landmarks[HandLandmark.PINKY_TIP];

  const palmSize = distance2D(wrist, middleMCP);
  const thumbIndexDist = distance2D(thumbTip, indexTip);
  const thumbMiddleDist = distance2D(thumbTip, middleTip);
  const thumbIndexTouching = thumbIndexDist < palmSize * 0.3;
  const thumbMiddleTouching = thumbMiddleDist < palmSize * 0.3;

  // Orientation helpers
  const fingersPointDown = isFingertipsBelow(wrist, middleTip);
  const yDiffIndex = Math.abs(indexTip.y - wrist.y);
  const xDiffIndex = Math.abs(indexTip.x - wrist.x);
  const fingersPointSideways = xDiffIndex > yDiffIndex;

  // ===================================================================
  //  PHRASE GESTURES  (whole-word signs, checked first)
  // ===================================================================

  // ---- I LOVE YOU: Thumb + Index + Pinky extended, Middle + Ring curled ----
  // This is the ASL "ILY" sign — a combination of I, L, and Y
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: true,
      middle: false,
      ring: false,
      pinky: true,
    })
  ) {
    return {
      letter: "ILY",
      confidence: 0.95,
      fingerState,
      phrase: "I LOVE YOU",
    };
  }

  // ---- GOOD / THUMBS UP: Fist with thumb pointing clearly up or down ----
  // Must be strict so sideways-thumb (ASL letter A) is not caught here.
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    })
  ) {
    const thumbMCP = landmarks[HandLandmark.THUMB_MCP];
    const thumbYDiff = thumbTip.y - thumbMCP.y;
    const thumbXDiff = Math.abs(thumbTip.x - thumbMCP.x);
    // Only match when thumb is clearly vertical (y-movement dominates x-movement)
    const thumbIsVertical = Math.abs(thumbYDiff) > thumbXDiff * 1.5;

    if (thumbIsVertical && thumbYDiff < -0.05 && thumbTip.y < wrist.y) {
      return {
        letter: "GOOD",
        confidence: 0.85,
        fingerState,
        phrase: "GOOD",
      };
    }
    if (thumbIsVertical && thumbYDiff > 0.05 && thumbTip.y > wrist.y) {
      return {
        letter: "BAD",
        confidence: 0.8,
        fingerState,
        phrase: "BAD",
      };
    }
  }

  // ---- OK: Thumb + Index circle, other 3 fingers spread (not together) ----
  if (thumbIndexTouching && fingerState.middle && fingerState.ring && fingerState.pinky) {
    const middleRingDist = distance2D(middleTip, ringTip);
    const ringPinkyDist = distance2D(ringTip, pinkyTip);
    // Fingers are spread apart (not held tightly like F)
    if (middleRingDist > palmSize * 0.08 && ringPinkyDist > palmSize * 0.08) {
      return {
        letter: "OK",
        confidence: 0.85,
        fingerState,
        phrase: "OK",
      };
    }
  }

  // ---- STOP: All fingers extended, palm facing forward, fingers together ----
  if (
    matchesPattern(fingerState, {
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    })
  ) {
    const indexMiddleDist = distance2D(indexTip, middleTip);
    const middleRingDist = distance2D(middleTip, ringTip);
    const ringPinkyDist = distance2D(ringTip, pinkyTip);
    const allTight =
      indexMiddleDist < palmSize * 0.12 &&
      middleRingDist < palmSize * 0.12 &&
      ringPinkyDist < palmSize * 0.12;
    if (allTight) {
      return {
        letter: "STOP",
        confidence: 0.8,
        fingerState,
        phrase: "STOP",
      };
    }
  }

  // ---- HELLO: Open hand, all 5 extended and spread ----
  if (extended === 5) {
    const indexMiddleDist = distance2D(indexTip, middleTip);
    const middleRingDist = distance2D(middleTip, ringTip);
    const ringPinkyDist = distance2D(ringTip, pinkyTip);
    const allSpread =
      indexMiddleDist > palmSize * 0.1 &&
      middleRingDist > palmSize * 0.1 &&
      ringPinkyDist > palmSize * 0.1;
    if (allSpread) {
      return {
        letter: "HI",
        confidence: 0.75,
        fingerState,
        phrase: "HELLO",
      };
    }
  }

  // ===================================================================
  //  NUMBER CLASSIFICATION  (only active in "numbers" or "all" mode)
  // ===================================================================

  if (mode === "numbers" || mode === "all") {
    const thumbRingDist = distance2D(thumbTip, ringTip);
    const thumbPinkyDist = distance2D(thumbTip, pinkyTip);

    // ---- 6: Thumb + Pinky tips touching, index + middle + ring extended ----
    if (
      thumbPinkyDist < palmSize * 0.3 &&
      fingerState.index &&
      fingerState.middle &&
      fingerState.ring
    ) {
      return {
        letter: "6",
        confidence: 0.8,
        fingerState,
        category: "number",
      };
    }

    // ---- 7: Thumb + Ring tips touching, index + middle + pinky extended ----
    if (
      thumbRingDist < palmSize * 0.3 &&
      fingerState.index &&
      fingerState.middle &&
      fingerState.pinky
    ) {
      return {
        letter: "7",
        confidence: 0.8,
        fingerState,
        category: "number",
      };
    }

    // ---- 8: Thumb + Middle tips touching, index + ring + pinky extended ----
    if (
      thumbMiddleTouching &&
      fingerState.index &&
      fingerState.ring &&
      fingerState.pinky
    ) {
      return {
        letter: "8",
        confidence: 0.8,
        fingerState,
        category: "number",
      };
    }

    // ---- 9: Thumb + Index circle (like F/OK), middle + ring + pinky extended ----
    // Distinguishes from F by being in number mode
    if (
      thumbIndexTouching &&
      fingerState.middle &&
      fingerState.ring &&
      fingerState.pinky &&
      mode === "numbers"
    ) {
      return {
        letter: "9",
        confidence: 0.8,
        fingerState,
        category: "number",
      };
    }

    // In "numbers" mode, map letter-like shapes to numbers
    if (mode === "numbers") {
      // 1 = index only (same as D)
      if (
        matchesPattern(fingerState, {
          index: true,
          middle: false,
          ring: false,
          pinky: false,
        })
      ) {
        return {
          letter: "1",
          confidence: 0.8,
          fingerState,
          category: "number",
        };
      }
      // 2 = index + middle spread (same as V)
      if (
        matchesPattern(fingerState, {
          thumb: false,
          index: true,
          middle: true,
          ring: false,
          pinky: false,
        })
      ) {
        return {
          letter: "2",
          confidence: 0.8,
          fingerState,
          category: "number",
        };
      }
      // 3 = thumb + index + middle
      if (
        matchesPattern(fingerState, {
          thumb: true,
          index: true,
          middle: true,
          ring: false,
          pinky: false,
        })
      ) {
        return {
          letter: "3",
          confidence: 0.8,
          fingerState,
          category: "number",
        };
      }
      // 4 = four fingers, no thumb (same as B)
      if (
        matchesPattern(fingerState, {
          thumb: false,
          index: true,
          middle: true,
          ring: true,
          pinky: true,
        })
      ) {
        return {
          letter: "4",
          confidence: 0.8,
          fingerState,
          category: "number",
        };
      }
      // 5 = all five extended
      if (extended === 5) {
        return {
          letter: "5",
          confidence: 0.8,
          fingerState,
          category: "number",
        };
      }
      // 10 = thumb up (same as GOOD but in number mode)
      if (
        matchesPattern(fingerState, {
          thumb: true,
          index: false,
          middle: false,
          ring: false,
          pinky: false,
        })
      ) {
        return {
          letter: "10",
          confidence: 0.7,
          fingerState,
          category: "number",
        };
      }
    }
  }

  // ===================================================================
  //  LETTER CLASSIFICATION  (ordered from most to least distinctive)
  // ===================================================================

  // ---- Y: Thumb + Pinky extended, others curled ----
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: false,
      middle: false,
      ring: false,
      pinky: true,
    })
  ) {
    return { letter: "Y", confidence: 0.9, fingerState };
  }

  // ---- J: Same hand shape as I (pinky only) but palm faces forward & motion downward.
  //         We detect when pinky is extended and hand is tilting / pinky points down. ----
  if (
    matchesPattern(fingerState, {
      index: false,
      middle: false,
      ring: false,
      pinky: true,
    }) &&
    !fingerState.thumb
  ) {
    // If pinky tip is below wrist → J (the downward arc), else I
    // Low confidence — motion tracker should override with high-confidence J
    if (pinkyTip.y > wrist.y + 0.04) {
      return { letter: "J", confidence: 0.4, fingerState };
    }
    return { letter: "I", confidence: 0.85, fingerState };
  }

  // ---- X: Index finger hooked (bent at DIP, PIP partially extended), others curled ----
  if (
    matchesPattern(fingerState, {
      middle: false,
      ring: false,
      pinky: false,
    }) &&
    !fingerState.thumb
  ) {
    const pipAngle = angleBetweenDeg(indexMCP, indexPIP, indexDIP);
    const dipAngle = angleBetweenDeg(indexPIP, indexDIP, indexTip);
    if (pipAngle > 120 && dipAngle < 140 && dipAngle > 60) {
      return { letter: "X", confidence: 0.75, fingerState };
    }
  }

  // ---- L: Thumb + Index extended, others curled (L shape, fingers point up) ----
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: true,
      middle: false,
      ring: false,
      pinky: false,
    })
  ) {
    // Q: like G/L but hand rotated so index points DOWN
    if (fingersPointDown) {
      return { letter: "Q", confidence: 0.7, fingerState };
    }
    // G: like L but index points sideways (horizontal)
    if (xDiffIndex > yDiffIndex * 1.5) {
      return { letter: "G", confidence: 0.7, fingerState };
    }
    return { letter: "L", confidence: 0.9, fingerState };
  }

  // ---- P: Like K (index + middle + thumb) but hand rotated so fingers point DOWN ----
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    }) &&
    fingersPointDown
  ) {
    return { letter: "P", confidence: 0.7, fingerState };
  }

  // ---- H: Index + Middle extended pointing sideways (horizontal) ----
  if (
    matchesPattern(fingerState, {
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    }) &&
    !fingerState.thumb &&
    fingersPointSideways
  ) {
    return { letter: "H", confidence: 0.75, fingerState };
  }

  // ---- V / U: Index + Middle extended, no thumb ----
  if (
    matchesPattern(fingerState, {
      thumb: false,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    })
  ) {
    const indexMiddleDist = distance2D(indexTip, middleTip);
    if (indexMiddleDist > palmSize * 0.15) {
      return { letter: "V", confidence: 0.85, fingerState };
    }
    return { letter: "U", confidence: 0.75, fingerState };
  }

  // ---- U: Index + Middle together (thumb may be out) ----
  if (
    matchesPattern(fingerState, {
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    })
  ) {
    const indexMiddleDist = distance2D(indexTip, middleTip);
    if (indexMiddleDist < palmSize * 0.15) {
      return { letter: "U", confidence: 0.8, fingerState };
    }
  }

  // ---- R: Index + Middle crossed ----
  if (
    matchesPattern(fingerState, {
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    })
  ) {
    const crossed = Math.abs(indexTip.x - middleTip.x) < palmSize * 0.05;
    if (crossed) {
      return { letter: "R", confidence: 0.7, fingerState };
    }
  }

  // ---- K: Index + Middle extended with thumb out, touching middle base ----
  if (
    matchesPattern(fingerState, {
      thumb: true,
      index: true,
      middle: true,
      ring: false,
      pinky: false,
    })
  ) {
    return { letter: "K", confidence: 0.65, fingerState };
  }

  // ---- W: Index + Middle + Ring extended, others curled ----
  if (
    matchesPattern(fingerState, {
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: false,
    })
  ) {
    return { letter: "W", confidence: 0.9, fingerState };
  }

  // ---- F: Thumb + Index touching circle, Middle + Ring + Pinky extended ----
  if (
    matchesPattern(fingerState, { middle: true, ring: true, pinky: true }) &&
    thumbIndexTouching
  ) {
    return { letter: "F", confidence: 0.85, fingerState };
  }

  // ---- D: Index extended, others curled, thumb touching middle ----
  if (
    matchesPattern(fingerState, {
      index: true,
      middle: false,
      ring: false,
      pinky: false,
    })
  ) {
    // Z: Index pointing and hand is drawing Z (motion). Static fallback:
    //    index only + pointing sideways/diagonally
    // Low confidence — motion tracker should override with high-confidence Z
    if (fingersPointSideways) {
      return { letter: "Z", confidence: 0.4, fingerState };
    }
    if (thumbMiddleTouching) {
      return { letter: "D", confidence: 0.8, fingerState };
    }
    return { letter: "D", confidence: 0.6, fingerState };
  }

  // ---- B: All four fingers extended, thumb curled across palm ----
  if (
    matchesPattern(fingerState, {
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    })
  ) {
    return { letter: "B", confidence: 0.85, fingerState };
  }

  // ---- Open hand (all 5 extended) → B variant ----
  if (extended === 5) {
    return { letter: "B", confidence: 0.6, fingerState };
  }

  // ==== Closed-hand signs (extended === 0) ====

  // ---- T: Thumb tucked between index and middle — tip near index PIP ----
  if (extended === 0) {
    const thumbToIndexPIP = distance2D(thumbTip, indexPIP);
    const thumbToIndexTip = distance2D(thumbTip, indexTip);
    if (
      thumbToIndexPIP < palmSize * 0.3 &&
      thumbToIndexPIP < thumbToIndexTip
    ) {
      return { letter: "T", confidence: 0.75, fingerState };
    }
  }

  // ---- O: All curled, thumb + index tips form circle ----
  if (extended === 0 && thumbIndexTouching) {
    return { letter: "O", confidence: 0.8, fingerState };
  }

  // ---- E: All curled, fingertips touching thumb (not index specifically) ----
  if (extended === 0) {
    const thumbToMiddle = distance2D(thumbTip, middleTip);
    const thumbToRing = distance2D(thumbTip, ringTip);
    const touchingMultiple =
      thumbToMiddle < palmSize * 0.25 || thumbToRing < palmSize * 0.25;
    if (touchingMultiple && !thumbIndexTouching) {
      return { letter: "E", confidence: 0.75, fingerState };
    }
  }

  // ---- N: Thumb emerges between middle and ring ----
  if (extended === 0) {
    const thumbNearMiddle = distance2D(thumbTip, middlePIP) < palmSize * 0.25;
    if (thumbNearMiddle) {
      return { letter: "N", confidence: 0.65, fingerState };
    }
  }

  // ---- M: Thumb emerges under ring finger ----
  if (extended === 0) {
    const thumbNearRing = distance2D(thumbTip, ringMCP) < palmSize * 0.25;
    if (thumbNearRing) {
      return { letter: "M", confidence: 0.6, fingerState };
    }
  }

  // ---- C: Curved hand (partially open, no fingers touching) ----
  if (extended === 0 && thumbTip.z < indexMCP.z) {
    return { letter: "C", confidence: 0.7, fingerState };
  }

  // ---- A: Fist with thumb to the side (thumb extended) ----
  if (
    matchesPattern(fingerState, {
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    }) &&
    fingerState.thumb
  ) {
    return { letter: "A", confidence: 0.8, fingerState };
  }

  // ---- S: Fist with thumb over fingers ----
  if (extended === 0) {
    const thumbInFront = thumbTip.z < indexMCP.z;
    if (thumbInFront) {
      return { letter: "S", confidence: 0.75, fingerState };
    }
    return { letter: "S", confidence: 0.6, fingerState };
  }

  // ---- Fallback ----
  const fallbacks: Record<number, string> = {
    0: "S",
    1: "D",
    2: "V",
    3: "W",
    4: "B",
    5: "B",
  };

  return {
    letter: fallbacks[extended] || "?",
    confidence: 0.3,
    fingerState,
  };
}
