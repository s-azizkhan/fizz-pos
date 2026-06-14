"use client";

import { useActionState, useEffect } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";
import { useUi } from "@/lib/store/ui";

const initial: WaitlistState = { ok: false };

export default function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, initial);
  const { joined, setJoined } = useUi();

  useEffect(() => {
    if (state.ok) setJoined(true);
  }, [state.ok, setJoined]);

  if (joined || state.ok) {
    return (
      <div className="rounded-fizz border border-fizz/40 bg-fizz/5 p-6 text-center">
        <p className="font-display text-xl font-semibold text-fizz">
          You&apos;re on the list ●
        </p>
        <p className="mt-1 text-sm text-steam">
          We&apos;ll be in touch when Fizz opens its doors.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="email"
            name="email"
            required
            placeholder="you@cafe.com"
            className="w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
          <input
            type="text"
            name="cafeName"
            placeholder="Café name (optional)"
            className="w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Get early access"}
        </button>
      </form>
      {state.error && <p className="text-sm text-[#E2655A]">{state.error}</p>}
    </div>
  );
}
