"use client";

import { DetectionMode } from "@/types/hand";

interface ModeToggleProps {
  mode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
}

const MODES: { value: DetectionMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "letters", label: "A-Z" },
  { value: "numbers", label: "1-10" },
  { value: "words", label: "Phrases" },
];

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === value
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
