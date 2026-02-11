import { DetectionMode, Landmark, SignClassification } from "@/types/hand";
import { classifyASLSign } from "./aslClassifier";
import { classifyWithML, isMLModelLoaded } from "./mlClassifier";
import {
  classifyWithFingerpose,
  isFingerposeReady,
} from "./fingerposeClassifier";

/**
 * Hybrid classifier that combines rule-based, ML-based, and fingerpose classification.
 *
 * Strategy:
 * 1. Always run rule-based as the baseline
 * 2. If ML model loaded and confident (>0.8) → trust ML
 * 3. If fingerpose agrees with rules → boost confidence
 * 4. Use majority voting when all three classifiers are available
 * 5. Fallback to rule-based if nothing else available
 */
export function classifyHybrid(
  landmarks: Landmark[],
  mode: DetectionMode = "all",
): SignClassification {
  const ruleResult = classifyASLSign(landmarks, mode);

  // Gather results from all available classifiers
  const mlResult = isMLModelLoaded() ? classifyWithML(landmarks) : null;
  const fpResult = isFingerposeReady()
    ? classifyWithFingerpose(landmarks)
    : null;

  // If only rule-based is available
  if (!mlResult && !fpResult) {
    return { ...ruleResult, classifierSource: "rule" };
  }

  // If fingerpose available but no ML
  if (!mlResult && fpResult) {
    if (fpResult.letter === ruleResult.letter) {
      // Agreement → boost confidence
      return {
        ...ruleResult,
        confidence: Math.min(
          1,
          (ruleResult.confidence + fpResult.confidence) / 1.5,
        ),
        classifierSource: "hybrid",
      };
    }
    // Fingerpose very confident
    if (fpResult.confidence > 0.85 && ruleResult.confidence < 0.6) {
      return {
        ...fpResult,
        fingerState: ruleResult.fingerState,
        classifierSource: "hybrid",
        alternatives: [
          { letter: ruleResult.letter, confidence: ruleResult.confidence },
        ],
      };
    }
    // Default to rule-based, show fingerpose as alternative
    return {
      ...ruleResult,
      classifierSource: "rule",
      alternatives: fpResult.letter !== ruleResult.letter
        ? [{ letter: fpResult.letter, confidence: fpResult.confidence }]
        : undefined,
    };
  }

  // ML is available (with or without fingerpose)
  if (mlResult) {
    // ML is very confident — trust it
    if (mlResult.confidence > 0.8) {
      return {
        ...mlResult,
        fingerState: ruleResult.fingerState,
        classifierSource: "ml",
        alternatives: [
          { letter: ruleResult.letter, confidence: ruleResult.confidence },
        ],
      };
    }

    // Three-way vote: if at least 2 agree, use that
    if (fpResult) {
      const votes = [ruleResult.letter, mlResult.letter, fpResult.letter];
      const counts = new Map<string, number>();
      for (const v of votes) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }

      let bestLetter = ruleResult.letter;
      let bestCount = 0;
      for (const [letter, count] of counts) {
        if (count > bestCount) {
          bestCount = count;
          bestLetter = letter;
        }
      }

      if (bestCount >= 2) {
        // Majority agrees
        const winner =
          bestLetter === mlResult.letter
            ? mlResult
            : bestLetter === fpResult.letter
              ? fpResult
              : ruleResult;
        const avgConfidence =
          votes.reduce((sum, v, i) => {
            if (v === bestLetter) {
              return (
                sum +
                [ruleResult.confidence, mlResult.confidence, fpResult.confidence][
                  i
                ]
              );
            }
            return sum;
          }, 0) / bestCount;

        return {
          ...winner,
          fingerState: ruleResult.fingerState,
          confidence: Math.min(1, avgConfidence * 1.1),
          classifierSource: "hybrid",
        };
      }
    }

    // ML unsure but rules are confident — trust rules
    if (ruleResult.confidence > 0.75 && mlResult.confidence < 0.5) {
      return {
        ...ruleResult,
        classifierSource: "rule",
        alternatives: [
          { letter: mlResult.letter, confidence: mlResult.confidence },
        ],
      };
    }

    // Both agree — boost confidence
    if (mlResult.letter === ruleResult.letter) {
      return {
        ...mlResult,
        fingerState: ruleResult.fingerState,
        confidence: Math.min(
          1,
          (mlResult.confidence + ruleResult.confidence) / 1.5,
        ),
        classifierSource: "hybrid",
      };
    }

    // Disagreement — trust whichever is more confident
    if (mlResult.confidence > ruleResult.confidence) {
      return {
        ...mlResult,
        fingerState: ruleResult.fingerState,
        classifierSource: "ml",
        alternatives: [
          { letter: ruleResult.letter, confidence: ruleResult.confidence },
        ],
      };
    }
  }

  return {
    ...ruleResult,
    classifierSource: "rule",
    alternatives: mlResult
      ? [{ letter: mlResult.letter, confidence: mlResult.confidence }]
      : undefined,
  };
}
