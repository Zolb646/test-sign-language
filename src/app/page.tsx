import HandDetector from "@/components/HandDetector";

export default function Home() {
  return (
    <main className="flex flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          ASL Hand Sign Detector
        </h1>
        <p className="mt-3 text-gray-400 max-w-xl">
          Real-time American Sign Language detection using your webcam and
          MediaPipe. Everything runs in your browser — no data is sent to any
          server.
        </p>
      </div>

      <HandDetector />
    </main>
  );
}
