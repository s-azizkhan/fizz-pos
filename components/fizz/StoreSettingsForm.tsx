"use client";

import { useActionState, useEffect, useState } from "react";
import { updateStore, type StoreState } from "@/app/actions/store";
import { formatDocNumber } from "@/lib/store/format";
import { CURRENCIES } from "@/lib/store/currencies";
import { COUNTRIES } from "@/lib/store/countries";
import type { Store } from "@/lib/db/schema";

const initial: StoreState = { ok: false };

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls =
  "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={labelCls}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-steam">{hint}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function StoreSettingsForm({ store }: { store: Store }) {
  const [state, action, pending] = useActionState(updateStore, initial);
  const [saved, setSaved] = useState(false);

  // Live preview state for the numbering section.
  const [invPrefix, setInvPrefix] = useState(store.invoicePrefix);
  const [invFmt, setInvFmt] = useState(store.invoiceNumberFormat);
  const [invSeq, setInvSeq] = useState(store.nextInvoiceSeq);
  const [ordPrefix, setOrdPrefix] = useState(store.orderPrefix);
  const [ordFmt, setOrdFmt] = useState(store.orderNumberFormat);
  const [ordSeq, setOrdSeq] = useState(store.nextOrderSeq);

  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  const now = new Date();
  const invPreview = formatDocNumber(invFmt, {
    prefix: invPrefix,
    seq: invSeq,
    date: now,
  });
  const ordPreview = formatDocNumber(ordFmt, {
    prefix: ordPrefix,
    seq: ordSeq,
    date: now,
  });

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section title="Store profile" hint="Name, contact, and where you pour.">
        <Field label="Store name" name="name" defaultValue={store.name} required />
        <Field label="Legal name" name="legalName" defaultValue={store.legalName} />
        <Field label="Email" name="email" type="email" defaultValue={store.email} placeholder="hello@cafe.com" />
        <Field label="Phone" name="phone" defaultValue={store.phone} placeholder="+1 555 0100" />
        <Field label="Address line 1" name="addressLine1" defaultValue={store.addressLine1} />
        <Field label="Address line 2" name="addressLine2" defaultValue={store.addressLine2} />
        <Field label="City" name="city" defaultValue={store.city} />
        <Field label="State / region" name="state" defaultValue={store.state} />
        <Field label="Postal code" name="postalCode" defaultValue={store.postalCode} />
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Country</span>
          <select
            name="country"
            defaultValue={store.country ?? ""}
            className={`${inputCls} appearance-none`}
          >
            <option value="" className="bg-ink-soft text-steam">
              — Select country —
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-ink-soft text-cream">
                {c}
              </option>
            ))}
          </select>
        </label>
        <Field label="Tax ID" name="taxId" defaultValue={store.taxId} />
        <Field label="Timezone" name="timezone" defaultValue={store.timezone} placeholder="UTC" required />
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Currency</span>
          <select
            name="currency"
            required
            defaultValue={store.currency}
            className={`${inputCls} appearance-none`}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-ink-soft text-cream">
                {c.code} — {c.label} ({c.symbol})
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Opening hours" hint="Store-local 24h time.">
        <Field label="Opening time" name="openingTime" type="time" defaultValue={store.openingTime} required />
        <Field label="Closing time" name="closingTime" type="time" defaultValue={store.closingTime} required />
      </Section>

      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Invoice &amp; order numbering
        </h2>
        <p className="mt-1 text-sm text-steam">
          Tokens:{" "}
          <code className="text-bubble">{"{PREFIX}"}</code>{" "}
          <code className="text-bubble">{"{SEQ:4}"}</code>{" "}
          <code className="text-bubble">{"{DDMMYYYY}"}</code>{" "}
          <code className="text-bubble">{"{YYYY}"}</code>{" "}
          <code className="text-bubble">{"{MM}"}</code>{" "}
          <code className="text-bubble">{"{DD}"}</code> — and {"{AUTO}"} for the sequence.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Invoice */}
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Invoice prefix</span>
              <input name="invoicePrefix" required value={invPrefix}
                onChange={(e) => setInvPrefix(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Invoice number format</span>
              <input name="invoiceNumberFormat" required value={invFmt}
                onChange={(e) => setInvFmt(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Next invoice sequence</span>
              <input name="nextInvoiceSeq" type="number" min={1} required value={invSeq}
                onChange={(e) => setInvSeq(Number(e.target.value) || 1)} className={inputCls} />
            </label>
            <div className="rounded-fizz border border-fizz/40 bg-fizz/5 px-4 py-3">
              <span className={labelCls}>Next invoice</span>
              <p className="mt-1 font-display text-lg font-semibold text-fizz">{invPreview}</p>
            </div>
          </div>

          {/* Order */}
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Order prefix</span>
              <input name="orderPrefix" required value={ordPrefix}
                onChange={(e) => setOrdPrefix(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Order number format</span>
              <input name="orderNumberFormat" required value={ordFmt}
                onChange={(e) => setOrdFmt(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Next order sequence</span>
              <input name="nextOrderSeq" type="number" min={1} required value={ordSeq}
                onChange={(e) => setOrdSeq(Number(e.target.value) || 1)} className={inputCls} />
            </label>
            <div className="rounded-fizz border border-fizz/40 bg-fizz/5 px-4 py-3">
              <span className={labelCls}>Next order</span>
              <p className="mt-1 font-display text-lg font-semibold text-fizz">{ordPreview}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
        {state.error && <span className="text-sm text-[#E2655A]">{state.error}</span>}
      </div>
    </form>
  );
}
