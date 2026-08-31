"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { formatDocNumber, upiPayLink } from "@/lib/store/format";
import UpiQr from "@/components/fizz/UpiQr";
import { CURRENCIES } from "@/lib/store/currencies";
import { COUNTRIES } from "@/lib/store/countries";
import { useSavedFlag } from "@/lib/hooks/useSavedFlag";
import type { Store } from "@/lib/db/schema";


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
  const trpc = useTRPC();
  const save = useMutation(
    trpc.store.update.mutationOptions({ onSuccess: () => toast.success("Settings saved") }),
  );
  const saved = useSavedFlag(save.isSuccess);

  // Live preview state for the numbering section.
  const [invPrefix, setInvPrefix] = useState(store.invoicePrefix);
  const [invFmt, setInvFmt] = useState(store.invoiceNumberFormat);
  const [invSeq, setInvSeq] = useState(store.nextInvoiceSeq);
  const [ordPrefix, setOrdPrefix] = useState(store.orderPrefix);
  const [ordFmt, setOrdFmt] = useState(store.orderNumberFormat);
  const [ordSeq, setOrdSeq] = useState(store.nextOrderSeq);

  // Live UPI preview: the same code a customer scans, minus the amount.
  const [upiId, setUpiId] = useState(store.upiId ?? "");
  const [upiName, setUpiName] = useState(store.upiName ?? "");
  const upiValid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim());

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
    <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(fields(e.currentTarget));
        }} className="flex flex-col gap-6">
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

      <Section
        title="Tax"
        hint="Sales tax applied to every bill at the till (GST, VAT, etc.)."
      >
        <Field
          label="Tax name"
          name="taxLabel"
          defaultValue={store.taxLabel}
          placeholder="GST"
          required
        />
        <Field
          label="Tax rate (%)"
          name="taxRate"
          type="number"
          defaultValue={String(Number(store.taxRate))}
          placeholder="0"
          required
        />
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Pricing</span>
          <select
            name="taxInclusive"
            defaultValue={store.taxInclusive ? "true" : "false"}
            className={`${inputCls} appearance-none`}
          >
            <option value="false" className="bg-ink-soft text-cream">
              Tax added on top of menu prices
            </option>
            <option value="true" className="bg-ink-soft text-cream">
              Menu prices already include tax
            </option>
          </select>
        </label>
      </Section>


      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Online payments (UPI)
        </h2>
        <p className="mt-1 max-w-[60ch] text-sm text-steam">
          Set your VPA and the till can throw a scannable QR — amount already
          filled — the moment a customer picks Online.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>UPI ID / VPA</span>
              <input
                name="upiId"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="cafe@okhdfcbank"
                autoCapitalize="none"
                spellCheck={false}
                className={inputCls}
              />
              {upiId.trim() !== "" && !upiValid && (
                <span className="text-sm text-[#E2655A]">
                  Use a VPA like cafe@okhdfcbank
                </span>
              )}
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Payee name</span>
              <input
                name="upiName"
                value={upiName}
                onChange={(e) => setUpiName(e.target.value)}
                placeholder={store.name}
                className={inputCls}
              />
              <span className="text-sm text-steam">
                What the customer sees in their UPI app before they pay.
              </span>
            </label>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center gap-3 rounded-fizz border border-ink-line bg-ink p-5 sm:w-[220px]">
            <span className={labelCls}>Preview</span>
            {upiValid ? (
              <>
                <UpiQr
                  value={upiPayLink({
                    vpa: upiId.trim(),
                    name: upiName.trim() || store.name,
                  })}
                  size={148}
                />
                <p className="text-center text-sm font-semibold text-cream">
                  {upiName.trim() || store.name}
                </p>
                <p className="break-all text-center text-xs text-steam">{upiId.trim()}</p>
              </>
            ) : (
              <p className="text-center text-sm text-steam">
                Add a valid VPA and your code appears here.
              </p>
            )}
          </div>
        </div>
      </section>

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
          disabled={save.isPending}
          className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
        {save.error && <span className="text-sm text-[#E2655A]">{save.error.message}</span>}
      </div>
    </form>
  );
}
