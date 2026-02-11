"use client";

import { DetectionMode, SignCategory } from "@/types/hand";
import { VOCABULARY, SignDefinition } from "@/lib/vocabularyConfig";

interface VocabularyPanelProps {
  mode: DetectionMode;
  activeSign?: string | null;
}

const CATEGORY_ORDER: SignCategory[] = ["letter", "number", "phrase"];
const CATEGORY_LABELS: Record<SignCategory, string> = {
  letter: "Letters",
  number: "Numbers",
  phrase: "Phrases",
  word: "Words",
};

function filterByMode(
  signs: SignDefinition[],
  mode: DetectionMode,
): SignDefinition[] {
  if (mode === "all") return signs;
  if (mode === "letters") return signs.filter((s) => s.category === "letter");
  if (mode === "numbers") return signs.filter((s) => s.category === "number");
  if (mode === "words")
    return signs.filter(
      (s) => s.category === "phrase" || s.category === "word",
    );
  return signs;
}

export default function VocabularyPanel({
  mode,
  activeSign,
}: VocabularyPanelProps) {
  const filtered = filterByMode(VOCABULARY, mode);

  // Group by category
  const grouped = new Map<SignCategory, SignDefinition[]>();
  for (const sign of filtered) {
    const list = grouped.get(sign.category) || [];
    list.push(sign);
    grouped.set(sign.category, list);
  }

  return (
    <div className="w-full max-w-lg bg-gray-800/30 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Supported Signs
      </h3>

      <div className="flex flex-col gap-3">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => (
          <div key={cat}>
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {CATEGORY_LABELS[cat]}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {grouped.get(cat)!.map((sign) => (
                <span
                  key={sign.label}
                  title={sign.description}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                    activeSign === sign.label
                      ? "bg-blue-600 text-white ring-1 ring-blue-400"
                      : "bg-gray-700/50 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {sign.displayName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
