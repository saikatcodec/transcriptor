import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlphaNet — Real-Time Transcription",
  description:
    "Browser-based real-time speech-to-text transcription powered by open-source AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
