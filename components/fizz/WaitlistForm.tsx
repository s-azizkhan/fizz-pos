"use client";

import { useMutation } from "@tanstack/react-query";
import { useUi } from "@/lib/store/ui";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";

export default function WaitlistForm() {
  const trpc = useTRPC();
  const { joined, setJoined } = useUi();
  const join = useMutation(
    trpc.waitlist.join.mutationOptions({
      // Error renders inline below the form.
      meta: { silentError: true },
      onSuccess: () => setJoined(true),
    }),
  );

  if (joined || join.isSuccess) {
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          join.mutate(fields(e.currentTarget));
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
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
          disabled={join.isPending}
          className="shrink-0 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {join.isPending ? "Joining…" : "Get early access"}
        </button>
      </form>
      {join.error && <p className="text-sm text-[#E2655A]">{join.error.message}</p>}
    </div>
  );
}
