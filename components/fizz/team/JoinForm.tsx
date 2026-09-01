"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";

// The invitee fills in only who they are. Email and role ride on the token —
// they're shown above this form as read-only, never posted back.
export default function JoinForm({ token }: { token: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  const accept = useMutation(
    trpc.team.accept.mutationOptions({
      meta: { silentError: true },
      onSuccess: ({ redirectTo }) => {
        router.replace(redirectTo);
        router.refresh();
      },
    }),
  );
  const error = accept.error?.message ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        accept.mutate(fields(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Your name
        </span>
        <input
          type="text"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          autoFocus
          placeholder="Alex Rivera"
          aria-invalid={error ? true : undefined}
          className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Password
        </span>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={error ? true : undefined}
            aria-describedby="pw-hint"
            className="w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 pr-16 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-steam transition-colors hover:text-cream"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        <span id="pw-hint" className="text-xs text-steam">
          At least 8 characters, with a letter and a number.
        </span>
      </label>

      {error && (
        <p className="text-sm text-[#E2655A]" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={accept.isPending}
        className="mt-1 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
      >
        {accept.isPending ? "Pouring you in…" : "Join the floor"}
      </button>
    </form>
  );
}
