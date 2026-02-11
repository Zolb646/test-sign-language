import HandDetector from "@/components/HandDetector";

export default function Home() {
  return (
    <main className="flex flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          ASL Hand Sign Detector
        </h1>
        <p className="mt-3 text-gray-400 max-w-xl">
          Real-time American Sign Language detection using your webcam,
          MediaPipe hand tracking, and fingerpose gesture recognition. Detects
          letters A-Z, numbers 1-10, and common phrases. Everything runs locally
          in your browser — no data is sent to any server.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <span className="px-3 py-1 text-xs bg-blue-900/40 text-blue-300 rounded-full">
            26 Letters
          </span>
          <span className="px-3 py-1 text-xs bg-purple-900/40 text-purple-300 rounded-full">
            10 Numbers
          </span>
          <span className="px-3 py-1 text-xs bg-green-900/40 text-green-300 rounded-full">
            12 Phrases
          </span>
          <span className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded-full">
            2 Hands
          </span>
        </div>
      </div>

      <HandDetector />
    </main>
  );
}
