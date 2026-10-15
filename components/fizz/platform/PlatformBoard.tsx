"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { toast } from "@/lib/store/toast";
import { confirmDialog } from "@/components/fizz/ConfirmDialog";
import { formatDate } from "@/lib/store/format";
import { PLANS, formatPaise, planByKey, type PlanKey, type PlanStatus } from "@/lib/store/plans";
import type { Payment } from "@/lib/db/schema";

type Row = {
  id: string;
  name: string;
  city: string | null;
  owner: string | null;
  members: number;
  createdAt: Date;
  status: PlanStatus;
  request: Payment | null;
};

const DATE = { day: "2-digit", month: "short", year: "numeric" } as const;
const inputCls =
  "rounded-fizz border border-ink-line bg-ink px-3 py-2 text-sm text-cream outline-none focus:border-fizz focus:ring-2 focus:ring-fizz/40";

function planLine(s: PlanStatus) {
  const name = planByKey(s.plan).name;
  if (s.trial) return `${name} trial · ends ${formatDate(s.until!, DATE)}`;
  if (s.until) return `${name} · until ${formatDate(s.until, DATE)}`;
  return s.lapsed ? `Free · ${planByKey(s.lapsed).name} lapsed` : "Free";
}

export default function PlatformBoard({ stores }: { stores: Row[] }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [q, setQ] = useState("");
  const refresh = () => router.refresh();

  const confirm = useMutation(trpc.billing.confirm.mutationOptions({ onSuccess: () => { toast.success("Confirmed. Plan is live."); refresh(); } }));
  const reject = useMutation(trpc.billing.reject.mutationOptions({ onSuccess: refresh }));
  const setPlan = useMutation(trpc.billing.setPlan.mutationOptions({ onSuccess: () => { toast.success("Plan set."); refresh(); } }));
  const busy = confirm.isPending || reject.isPending || setPlan.isPending;

  const rows = stores.filter((s) => {
    const t = q.trim().toLowerCase();
    return !t || s.name.toLowerCase().includes(t) || (s.owner ?? "").includes(t) || (s.request?.reference ?? "").toLowerCase().includes(t);
  });
  const waiting = rows.filter((s) => s.request).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search counter, owner email or FZ- reference…"
          className={`${inputCls} w-full sm:w-96 rounded-full`}
        />
        <span className="text-sm text-steam">
          {stores.length} counters · <span className={waiting ? "font-semibold text-fizz" : ""}>{waiting} waiting on payment</span>
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((s) => (
          <li key={s.id} className={`rounded-fizz border bg-ink-soft p-5 ${s.request ? "border-fizz/50" : "border-ink-line"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {s.name}
                  {s.city && <span className="ml-2 text-sm font-normal text-steam">{s.city}</span>}
                </h2>
                <p className="text-sm text-steam">
                  {s.owner ?? "no owner"} · {s.members} on team · since {formatDate(s.createdAt, DATE)}
                </p>
                <p className="mt-1 text-sm text-cream">{planLine(s.status)}</p>
              </div>

              {s.request ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const note = String(new FormData(e.currentTarget).get("note") ?? "");
                    confirm.mutate({ id: s.request!.id, note });
                  }}
                >
                  <span className="rounded-full bg-ink px-3 py-1 font-display font-bold tracking-wide text-fizz">{s.request.reference}</span>
                  <span className="text-sm text-cream">
                    {planByKey(s.request.plan as PlanKey).name} · {s.request.period} · <span className="font-display font-bold">{formatPaise(s.request.amount)}</span>
                  </span>
                  <input name="note" placeholder="UPI txn id / how paid" maxLength={200} className={`${inputCls} w-44`} />
                  <button type="submit" disabled={busy} className="rounded-fizz bg-fizz px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
                    Payment received
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await confirmDialog({ title: "Drop this request?", body: "The owner can request again any time.", confirmLabel: "Drop" }))
                        reject.mutate({ id: s.request!.id });
                    }}
                    className="text-sm text-steam transition-colors hover:text-[#E2655A] disabled:opacity-60"
                  >
                    Drop
                  </button>
                </form>
              ) : (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    setPlan.mutate({ storeId: s.id, plan: f.get("plan") as PlanKey, until: String(f.get("until") ?? "") });
                  }}
                >
                  <select name="plan" defaultValue={s.status.trial ? "free" : s.status.plan} className={`${inputCls} appearance-none`}>
                    {PLANS.map((p) => (
                      <option key={p.key} value={p.key} className="bg-ink-soft text-cream">{p.name}</option>
                    ))}
                  </select>
                  <input name="until" type="date" defaultValue={s.status.until && !s.status.trial ? s.status.until.toISOString().slice(0, 10) : ""} className={inputCls} />
                  <button type="submit" disabled={busy} className="rounded-fizz border border-ink-line px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz/50 disabled:opacity-60">
                    Set plan
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="py-10 text-center text-steam">Nothing matches.</li>}
      </ul>
    </div>
  );
}
