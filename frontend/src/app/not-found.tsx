import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-ink flex flex-col items-center justify-center px-6">
      <p className="font-mono text-accent text-6xl font-bold mb-4">404</p>
      <p className="font-display text-2xl text-paper mb-6">Page not found</p>
      <Link
        href="/"
        className="font-mono text-sm text-muted hover:text-paper transition-colors underline underline-offset-4"
      >
        Return home
      </Link>
    </main>
  );
}
