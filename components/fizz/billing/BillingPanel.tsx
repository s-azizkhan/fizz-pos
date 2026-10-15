"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { toast } from "@/lib/store/toast";
import { formatDate, upiPayLink } from "@/lib/store/format";
import { FEATURES } from "@/lib/store/features";
import { PLANS, formatPaise, planByKey, planLocks, type Period, type PlanKey, type PlanStatus } from "@/lib/store/plans";
import type { Payment } from "@/lib/db/schema";
import UpiQr from "@/components/fizz/UpiQr";
import { WA_HREF, PHONE_DISPLAY } from "@/components/fizz/landing/contact";

type Status = PlanStatus & {
  pending: Payment | null;
  history: { id: string; reference: string; plan: string; period: string; amount: number; paidAt: Date | null }[];
  payTo: { upiId: string; upiName: string } | null;
};

const DATE = { day: "2-digit", month: "short", year: "numeric" } as const;
const periodWord = (p: string) => (p === "year" ? "a year" : "a month");

export default function BillingPanel({ status }: { status: Status }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("year");

  const request = useMutation(
    trpc.billing.request.mutationOptions({
      onSuccess: () => {
        toast.success("Request noted. Pay with the reference and we'll switch you on.");
        router.refresh();
      },
    }),
  );
  const cancel = useMutation(trpc.billing.cancelRequest.mutationOptions({ onSuccess: () => router.refresh() }));
  const current = planByKey(status.plan);
  const pending = status.pending;
  const busy = request.isPending || cancel.isPending;

  return (
    <div className="flex flex-col gap-8">
      {/* Where you stand */}
      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Current plan</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-display text-3xl font-bold tracking-tight">{current.name}</h2>
          {status.trial && <span className="rounded-full border border-fizz/40 bg-fizz/10 px-3 py-1 text-xs font-semibold text-fizz">Free trial</span>}
        </div>
        <p className="mt-2 max-w-[60ch] text-steam">
          {status.trial && status.until
            ? `Everything in Pro, free until ${formatDate(status.until, DATE)}. Pick a plan before then to keep it.`
            : status.until
              ? `Paid through ${formatDate(status.until, DATE)}. Renew below to extend.`
              : status.lapsed
                ? `Your ${planByKey(status.lapsed).name} plan lapsed. You're on ${current.name} — renew to switch the rest back on.`
                : `${current.tagline} Upgrade when you want margins, inventory or a bigger team.`}
        </p>
      </section>

      {/* An open request: how to pay */}
      {pending && (
        <section className="rounded-fizz border border-fizz/50 bg-ink-soft p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Waiting for payment</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
            {planByKey(pending.plan as PlanKey).name} for {periodWord(pending.period)} — {formatPaise(pending.amount)}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <ol className="flex flex-col gap-3 text-cream">
              <li className="flex gap-3">
                <span className="font-display font-bold text-fizz">1</span>
                <span>
                  Pay <span className="font-display font-bold">{formatPaise(pending.amount)}</span>
                  {status.payTo ? (
                    <>
                      {" "}to UPI <span className="font-semibold">{status.payTo.upiId}</span> — scan the code or tap it on your phone.
                    </>
                  ) : (
                    <> — message us on WhatsApp for the account details.</>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display font-bold text-fizz">2</span>
                <span>
                  Put <span className="rounded-full bg-ink px-2.5 py-0.5 font-display font-bold tracking-wide text-fizz">{pending.reference}</span> in the payment note, then send us the screenshot.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display font-bold text-fizz">3</span>
                <span>We confirm, your plan switches on. Usually within the hour, always the same day.</span>
              </li>
            </ol>
            {status.payTo && (
              <div className="flex flex-col items-center gap-2">
                <UpiQr value={upiPayLink({ vpa: status.payTo.upiId, name: status.payTo.upiName, amount: pending.amount / 100, note: pending.reference })} size={180} />
                <a
                  href={upiPayLink({ vpa: status.payTo.upiId, name: status.payTo.upiName, amount: pending.amount / 100, note: pending.reference })}
                  className="text-sm font-semibold text-fizz hover:underline sm:hidden"
                >
                  Open in UPI app
                </a>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={WA_HREF(`Hi, paid ${formatPaise(pending.amount)} for ${planByKey(pending.plan as PlanKey).name} (${pending.period}). Reference ${pending.reference}. Screenshot attached.`)}
              className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
            >
              Send screenshot on WhatsApp
            </a>
            <span className="text-sm text-steam">or call {PHONE_DISPLAY}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => cancel.mutate()}
              className="ml-auto text-sm text-steam transition-colors hover:text-cream disabled:opacity-60"
            >
              Cancel request
            </button>
          </div>
        </section>
      )}

      {/* Plans */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-tight">Plans</h2>
          <div className="flex rounded-full border border-ink-line bg-ink-soft p-1 text-sm font-semibold">
            {(["month", "year"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`rounded-full px-4 py-1.5 transition-colors ${period === p ? "bg-fizz text-ink" : "text-steam hover:text-cream"}`}
              >
                {p === "month" ? "Monthly" : "Yearly · 2 months free"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => {
            const locks = planLocks(p.key);
            const isCurrent = status.plan === p.key && !status.trial;
            const price = p.price[period];
            const requested = pending?.plan === p.key && pending.period === period;
            return (
              <article
                key={p.key}
                className={`flex flex-col rounded-fizz border bg-ink-soft p-7 ${p.key === "pro" ? "border-fizz/50" : "border-ink-line"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">{p.name}</p>
                <p className="mt-3 font-display text-3xl font-bold tracking-tight">
                  {price ? formatPaise(price) : "Free"}
                  {price ? <span className="text-base font-semibold text-steam"> / {period}</span> : null}
                </p>
                <p className="mt-2 text-sm text-steam">{p.tagline}</p>
                <ul className="mt-5 flex flex-col gap-1.5 text-sm">
                  <li className="text-cream">✓ POS, orders, menu — always</li>
                  <li className="text-cream">✓ {p.team === null ? "Unlimited team" : p.team === 1 ? "Owner only" : `Team of ${p.team}`}</li>
                  {p.domain && <li className="text-cream">✓ Menu on your own domain</li>}
                  {FEATURES.filter((f) => f.key !== "docs").map((f) => (
                    <li key={f.key} className={locks.includes(f.key) ? "text-steam line-through decoration-ink-line" : "text-cream"}>
                      {locks.includes(f.key) ? "–" : "✓"} {f.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  {p.key === "free" ? (
                    <p className="text-sm text-steam">{isCurrent ? "Your current plan." : "What you fall back to."}</p>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || requested}
                      onClick={() => request.mutate({ plan: p.key, period })}
                      className="w-full rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
                    >
                      {requested ? "Requested — pay above" : isCurrent ? `Renew ${p.name}` : `Get ${p.name}`}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-steam">
          Prices in INR. Pay by UPI or bank transfer; we switch the plan on by hand once it lands.
        </p>
      </section>

      {/* Receipts */}
      {status.history.length > 0 && (
        <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
          <h2 className="font-display text-xl font-bold tracking-tight">Payments</h2>
          <ul className="mt-4 divide-y divide-ink-line text-sm">
            {status.history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="text-cream">
                  {planByKey(h.plan as PlanKey).name} · {periodWord(h.period)} · <span className="text-steam">{h.reference}</span>
                </span>
                <span className="text-steam">{h.paidAt ? formatDate(h.paidAt, DATE) : "—"}</span>
                <span className="font-display font-bold text-cream">{formatPaise(h.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
