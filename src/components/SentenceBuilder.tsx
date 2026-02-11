"use client";

interface SentenceBuilderProps {
  sentence: string;
  onClear: () => void;
  onBackspace: () => void;
  onAddSpace: () => void;
}

export default function SentenceBuilder({
  sentence,
  onClear,
  onBackspace,
  onAddSpace,
}: SentenceBuilderProps) {
  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Sentence Builder</span>
        <span className="text-xs text-gray-500">
          Hold a sign steady to add it
        </span>
      </div>

      {/* Sentence display */}
      <div className="min-h-[60px] p-4 bg-gray-800/50 border border-gray-700 rounded-xl font-mono text-xl text-white tracking-widest flex items-center">
        {sentence ? (
          <span>{sentence}</span>
        ) : (
          <span className="text-gray-600">Start signing...</span>
        )}
        <span className="ml-0.5 w-0.5 h-6 bg-blue-400 animate-pulse" />
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onAddSpace}
          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          Space
        </button>
        <button
          onClick={onBackspace}
          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          Backspace
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm bg-red-900/50 hover:bg-red-900/80 text-red-300 rounded-lg transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
