import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASL Hand Sign Detector",
  description:
    "Real-time ASL hand sign language detection using MediaPipe and your webcam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
