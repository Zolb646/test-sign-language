import { DetectionMode, Landmark, SignClassification } from "@/types/hand";
import { classifyASLSign } from "./aslClassifier";
import { classifyWithML, isMLModelLoaded } from "./mlClassifier";

/**
 * Hybrid classifier that combines rule-based and ML-based classification.
 *
 * Strategy:
 * - ML confidence > 0.8 → trust ML (with rule-based fingerState)
 * - Rule confidence > 0.75 and ML < 0.5 → trust rules
 * - Both agree → boost confidence
 * - Disagree → trust whichever is more confident
 * - ML not loaded → pure rule-based fallback
 */
export function classifyHybrid(
  landmarks: Landmark[],
  mode: DetectionMode = "all",
): SignClassification {
  const ruleResult = classifyASLSign(landmarks, mode);

  if (!isMLModelLoaded()) {
    return { ...ruleResult, classifierSource: "rule" };
  }

  const mlResult = classifyWithML(landmarks);

  if (!mlResult) {
    return { ...ruleResult, classifierSource: "rule" };
  }

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

  return {
    ...ruleResult,
    classifierSource: "rule",
    alternatives: [
      { letter: mlResult.letter, confidence: mlResult.confidence },
    ],
  };
}
