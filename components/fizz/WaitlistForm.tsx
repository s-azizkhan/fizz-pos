"use client";

import { useMutation } from "@tanstack/react-query";
import { useUi } from "@/lib/store/ui";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";

const INPUT =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";

export default function WaitlistForm({ cta = "Plug my leaks →" }: { cta?: string }) {
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
          You&apos;re in ●
        </p>
        <p className="mt-1 text-sm text-steam">
          We&apos;ll WhatsApp you within 24 hours to set up your café.
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
        className="grid gap-3 sm:grid-cols-2"
      >
        <input type="email" name="email" required placeholder="you@yourcafe.in" className={INPUT} />
        <input
          type="tel"
          name="phone"
          inputMode="numeric"
          placeholder="WhatsApp number (+91…)"
          className={INPUT}
        />
        <input
          type="text"
          name="cafeName"
          placeholder="Café / outlet name"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={join.isPending}
          className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {join.isPending ? "Saving…" : cta}
        </button>
      </form>
      <p className="text-xs text-steam">
        Free during early access · No card · No hardware to buy · Setup over WhatsApp
      </p>
      {join.error && <p className="text-sm text-[#E2655A]">{join.error.message}</p>}
    </div>
  );
}
