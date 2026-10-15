"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { startNav } from "@/components/fizz/NavProgress";
import { CURRENCIES } from "@/lib/store/currencies";
import { COUNTRIES } from "@/lib/store/countries";
import { FEATURES, FEATURE_KEYS, type FeatureKey } from "@/lib/store/features";
import type { Store } from "@/lib/db/schema";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const optCls = "bg-ink-soft text-cream";

const STEPS = [
  { title: "Your counter", hint: "Name, phone, where you pour." },
  { title: "Tax", hint: "What every bill charges on top (GST, VAT…). 0 = none." },
  { title: "Hours", hint: "Store-local 24h time. Drives the open/closed badge." },
  { title: "Features", hint: "Switch off what you don't use. POS, Orders and Menu always stay on." },
];

// All steps stay mounted (hidden, not unmounted) so one submit carries the
// whole form — "Skip" is the same submit with every default left in place.
export default function OnboardingWizard({ store }: { store: Store }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [off, setOff] = useState<FeatureKey[]>(
    store.disabledFeatures.filter((k): k is FeatureKey => FEATURE_KEYS.includes(k as FeatureKey)),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const tzRef = useRef<HTMLInputElement>(null);
  const tzListRef = useRef<HTMLDataListElement>(null);

  // Browser knows the owner's zone; the server default is UTC. Done via the
  // DOM after mount so SSR and hydration still agree on the initial markup.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tzRef.current && tzRef.current.value === "UTC" && tz) tzRef.current.value = tz;
      tzListRef.current?.replaceChildren(
        ...Intl.supportedValuesOf("timeZone").map((z) => Object.assign(document.createElement("option"), { value: z })),
      );
    } catch {}
  }, []);

  const save = useMutation(
    trpc.store.onboard.mutationOptions({
      meta: { silentError: true },
      onSuccess: ({ redirectTo }) => {
        startNav();
        router.replace(redirectTo);
        router.refresh();
      },
    }),
  );
  const error = save.error?.message ?? null;
  const last = step === STEPS.length - 1;

  // Native validation per step: only check the visible inputs before moving on.
  const next = () => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const bad = panel?.querySelector<HTMLInputElement>(":invalid");
    if (bad) return bad.reportValidity();
    setStep((s) => s + 1);
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(fields(e.currentTarget));
      }}
      className="flex flex-col gap-6"
    >
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                i === step
                  ? "border-fizz bg-fizz/10 text-fizz"
                  : i < step
                    ? "border-ink-line text-cream hover:border-fizz/50"
                    : "border-ink-line text-steam"
              }`}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>

      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <h2 className="font-display text-xl font-bold tracking-tight">{STEPS[step].title}</h2>
        <p className="mt-1 max-w-[60ch] text-sm text-steam">{STEPS[step].hint}</p>

        <div data-step="0" className={step === 0 ? "mt-6 grid gap-5 sm:grid-cols-2" : "hidden"}>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Counter name</span>
            <input name="name" required maxLength={120} defaultValue={store.name} className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Phone</span>
            <input name="phone" defaultValue={store.phone ?? ""} placeholder="+91 98765 43210" className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Country</span>
            <select name="country" defaultValue={store.country ?? ""} className={`${inputCls} appearance-none`}>
              <option value="" className="bg-ink-soft text-steam">— Select country —</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className={optCls}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Currency</span>
            <select name="currency" required defaultValue={store.currency} className={`${inputCls} appearance-none`}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className={optCls}>
                  {c.code} — {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className={labelCls}>Timezone</span>
            <input ref={tzRef} name="timezone" required list="tz-list" defaultValue={store.timezone} className={inputCls} />
            <datalist id="tz-list" ref={tzListRef} />
          </label>
        </div>

        <div data-step="1" className={step === 1 ? "mt-6 grid gap-5 sm:grid-cols-2" : "hidden"}>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Tax name</span>
            <input name="taxLabel" required maxLength={24} defaultValue={store.taxLabel} placeholder="GST" className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Tax rate (%)</span>
            <input name="taxRate" type="number" min={0} max={100} step="0.001" required defaultValue={String(Number(store.taxRate))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className={labelCls}>Pricing</span>
            <select name="taxInclusive" defaultValue={store.taxInclusive ? "true" : "false"} className={`${inputCls} appearance-none`}>
              <option value="false" className={optCls}>Tax added on top of menu prices</option>
              <option value="true" className={optCls}>Menu prices already include tax</option>
            </select>
          </label>
        </div>

        <div data-step="2" className={step === 2 ? "mt-6 grid gap-5 sm:grid-cols-2" : "hidden"}>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Opening time</span>
            <input name="openingTime" type="time" required defaultValue={store.openingTime} className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Closing time</span>
            <input name="closingTime" type="time" required defaultValue={store.closingTime} className={inputCls} />
          </label>
        </div>

        <div data-step="3" className={step === 3 ? "mt-6 grid gap-3 sm:grid-cols-2" : "hidden"}>
          <input type="hidden" name="disabledFeatures" value={JSON.stringify(off)} />
          {FEATURES.map((f) => {
            const checked = !off.includes(f.key);
            const blocked = "needs" in f && off.includes(f.needs);
            return (
              <label
                key={f.key}
                className={`flex cursor-pointer items-start gap-3 rounded-fizz border p-4 transition-colors ${
                  checked && !blocked ? "border-fizz/40 bg-fizz/5" : "border-ink-line bg-ink"
                } ${blocked ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={blocked}
                  onChange={() => setOff((o) => (checked ? [...o, f.key] : o.filter((k) => k !== f.key)))}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#C6F432]"
                />
                <span>
                  <span className="block font-semibold text-cream">{f.label}</span>
                  <span className="block text-sm text-steam">{blocked ? "Turn Inventory on first." : f.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {error && (
        <p className="text-sm text-[#E2655A]" role="alert" aria-live="polite">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz/50"
          >
            Back
          </button>
        )}
        {last ? (
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
          >
            {save.isPending ? "Opening the floor…" : "Open the floor"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
          >
            Next
          </button>
        )}
        <button
          type="submit"
          disabled={save.isPending}
          className="ml-auto text-sm text-steam transition-colors hover:text-cream disabled:opacity-60"
        >
          Skip for now — use defaults
        </button>
      </div>
    </form>
  );
}
