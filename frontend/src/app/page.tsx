import { TranscriptionPanel } from "@/components/transcription/TranscriptionPanel";
import { Mic } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-ink">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="w-4 h-4 text-accent" />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-paper/70">
            AlphaNet Transcribe
          </span>
        </div>
        <span className="font-mono text-xs text-muted tracking-widest">
          CPU · Open-Source
        </span>
      </header>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="font-display text-5xl sm:text-6xl text-paper leading-tight mb-4">
            Real-Time
            <br />
            <span className="text-accent italic">Transcription</span>
          </h1>
          <p className="font-body text-muted text-base max-w-md leading-relaxed">
            Speak into your microphone. Your words are streamed and transcribed
            in real time using a locally-hosted speech recognition model — no
            cloud, no data leaves your machine.
          </p>
        </div>

        {/* Panel */}
        <TranscriptionPanel />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-20 px-6 py-4">
        <p className="font-mono text-xs text-muted text-center">
          Powered by Faster-Whisper (tiny) · FastAPI · PostgreSQL
        </p>
      </footer>
    </main>
  );
}
