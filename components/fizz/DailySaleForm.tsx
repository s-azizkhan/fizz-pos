"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { useSavedFlag } from "@/lib/hooks/useSavedFlag";
import { formatMoney } from "@/lib/store/format";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function DailySaleForm({
  currency,
  onSuccess,
}: {
  currency: string;
  onSuccess?: () => void;
}) {
  const trpc = useTRPC();
  const create = useMutation(trpc.dailySales.create.mutationOptions());
  const saved = useSavedFlag(create.isSuccess);

  const [cash, setCash] = useState("0");
  const [online, setOnline] = useState("0");
  const [credit, setCredit] = useState("0");

  const total = (Number(cash) || 0) + (Number(online) || 0) + (Number(credit) || 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        create.mutate(fields(form), {
          onSuccess: () => {
            toast.success("Sale recorded");
            form.reset();
            setCash("0");
            setOnline("0");
            setCredit("0");
            onSuccess?.();
          },
        });
      }}
      className="rounded-fizz border border-ink-line bg-ink-soft p-7"
    >
      <h2 className="font-display text-xl font-bold tracking-tight">
        Record a day
      </h2>
      <p className="mt-1 text-sm text-steam">
        Enter what you took, split by how it was paid.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Sale date</span>
          <input
            name="saleDate"
            type="date"
            required
            defaultValue={todayLocal()}
            max={todayLocal()}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Cash sale</span>
          <input
            name="cashSale"
            type="number"
            min={0}
            step="0.01"
            required
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Online sale</span>
          <input
            name="onlineSale"
            type="number"
            min={0}
            step="0.01"
            required
            value={online}
            onChange={(e) => setOnline(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Credit sale</span>
          <input
            name="creditSale"
            type="number"
            min={0}
            step="0.01"
            required
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-fizz border border-fizz/40 bg-fizz/5 px-4 py-3">
          <span className={labelCls}>Day total</span>
          <p className="mt-1 font-display text-lg font-semibold text-fizz">
            {formatMoney(total, currency)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
          {create.error && (
            <span className="text-sm text-[#E2655A]">{create.error.message}</span>
          )}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
          >
            {create.isPending ? "Saving…" : "Record sale"}
          </button>
        </div>
      </div>
    </form>
  );
}
