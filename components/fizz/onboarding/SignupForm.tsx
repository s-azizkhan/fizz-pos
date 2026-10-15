"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { startNav } from "@/components/fizz/NavProgress";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

export default function SignupForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  const signup = useMutation(
    trpc.auth.signup.mutationOptions({
      meta: { silentError: true },
      onSuccess: ({ redirectTo }) => {
        startNav();
        router.replace(redirectTo);
        router.refresh();
      },
    }),
  );
  const error = signup.error?.message ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        signup.mutate(fields(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-2">
        <span className={labelCls}>Counter name</span>
        <input
          name="storeName"
          required
          maxLength={120}
          autoFocus
          placeholder="Sharma Chai Point"
          aria-invalid={error ? true : undefined}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelCls}>Your name</span>
        <input
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Alex Rivera"
          aria-invalid={error ? true : undefined}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelCls}>Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@yourshop.in"
          aria-invalid={error ? true : undefined}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelCls}>Password</span>
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
            className={`${inputCls} pr-16`}
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
        disabled={signup.isPending}
        className="mt-1 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
      >
        {signup.isPending ? "Opening the counter…" : "Open my counter"}
      </button>
    </form>
  );
}
