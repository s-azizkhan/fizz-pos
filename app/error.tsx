"use client";

import { useEffect } from "react";
import Link from "next/link";
import ErrorScreen from "@/components/fizz/ErrorScreen";

// Route-level error boundary. `reset` re-renders the segment, which is the
// right first move for a transient failure (a dropped DB connection, a timeout)
// — no full reload, no lost place in the app.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      status="500"
      tone="error"
      eyebrow="Something fizzled"
      title="That didn't pour right."
      body="The page hit an error on the way out. Your data is untouched — nothing was half-saved."
      note={
        <>
          <b className="font-semibold text-cream">Try again first.</b> If it
          keeps happening, quote this to whoever runs your Fizz:
          <code className="mt-2 block break-all font-display text-xs text-steam">
            {error.digest ?? error.message ?? "no error id"}
          </code>
        </>
      }
      action={
        <>
          <button
            onClick={reset}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Back to the floor
          </Link>
        </>
      }
    />
  );
}
