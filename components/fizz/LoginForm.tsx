"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";

export default function LoginForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  const signIn = useMutation(
    trpc.auth.login.mutationOptions({
      // The error renders inline below; no duplicate toast.
      meta: { silentError: true },
      onSuccess: ({ redirectTo }) => {
        // The session cookie is set by the procedure; redirect() cannot run
        // inside one, so navigate here. refresh() pulls the authed RSC tree.
        router.replace(redirectTo);
        router.refresh();
      },
    }),
  );
  const error = signIn.error?.message ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        signIn.mutate(fields(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@cafe.com"
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
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={error ? true : undefined}
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
      </label>

      {error && (
        <p className="text-sm text-[#E2655A]" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={signIn.isPending}
        className="mt-1 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
      >
        {signIn.isPending ? "Pouring you in…" : "Sign in"}
      </button>
    </form>
  );
}
