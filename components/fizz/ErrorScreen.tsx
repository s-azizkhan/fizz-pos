import Link from "next/link";
import Bubbles from "./Bubbles";

// One layout behind every failure state — 404, runtime error, offline route.
// Same bones, different words, so a broken page still feels like Fizz.
export default function ErrorScreen({
  status,
  eyebrow,
  title,
  body,
  note,
  action,
  tone = "lime",
}: {
  status: string;
  eyebrow: string;
  title: string;
  body: string;
  note?: React.ReactNode;
  action: React.ReactNode;
  tone?: "lime" | "error";
}) {
  const accent = tone === "error" ? "text-[#E2655A]" : "text-fizz";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-16">
      <Bubbles />

      {/* The status code as a quiet watermark — present, never shouting. */}
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-display text-[38vw] font-bold leading-none text-cream/[0.03] sm:text-[22rem]"
      >
        {status}
      </span>

      <div className="relative max-w-[42ch] text-center">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight"
          aria-label="Fizz home"
        >
          Fi<span className="text-fizz">zz</span>
          <span className="align-super text-xs text-bubble">●</span>
        </Link>

        <p
          className={`mt-8 text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}
        >
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,7vw,44px)] font-bold leading-[1.05] tracking-tight">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-[34ch] text-steam">{body}</p>

        {note && (
          <div className="mt-7 rounded-fizz border border-ink-line bg-ink-soft p-4 text-left text-sm text-steam">
            {note}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      </div>
    </main>
  );
}
