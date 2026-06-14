"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/store/format";
import { PRESET_LABELS, PRESET_ORDER, type RangePreset } from "@/lib/store/date-range";
import type { Analytics, Metric, Slice } from "@/lib/store/analytics";

// Percentage change between current and previous, guarding divide-by-zero.
function delta(m: Metric): { pct: number; up: boolean } | null {
  if (m.prev === 0) return m.value === 0 ? null : { pct: 100, up: true };
  const pct = ((m.value - m.prev) / Math.abs(m.prev)) * 100;
  return { pct: Math.round(pct), up: pct >= 0 };
}

const SLICE_COLORS = ["#C6F432", "#38E1D6", "#8A93A1", "#E2655A", "#6b7280"];

export default function AnalyticsClient({
  analytics,
  currency,
  preset,
  from,
  to,
}: {
  analytics: Analytics;
  currency: string;
  preset: RangePreset;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const money = (x: number) => formatMoney(x, currency);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [showCustom, setShowCustom] = useState(preset === "custom");

  function applyPreset(p: RangePreset) {
    setShowCustom(false);
    router.push(`/dashboard/analytics?range=${p}`);
  }
  function applyCustom() {
    if (!customFrom || !customTo) return;
    router.push(`/dashboard/analytics?range=custom&from=${customFrom}&to=${customTo}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Insights
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            Analytics
          </h1>
          <p className="mt-1 text-steam">
            Sales, profit, and what&apos;s selling — across any window.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PRESET_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              preset === p && !showCustom
                ? "border-fizz bg-fizz text-ink"
                : "border-ink-line bg-ink-soft text-cream hover:border-fizz"
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            preset === "custom" || showCustom
              ? "border-fizz bg-fizz text-ink"
              : "border-ink-line bg-ink-soft text-cream hover:border-fizz"
          }`}
        >
          Custom range
        </button>
      </div>

      {showCustom && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-fizz border border-ink-line bg-ink-soft p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.18em] text-steam">From</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-fizz border border-ink-line bg-ink px-3 py-2 text-cream outline-none focus:border-fizz focus:ring-2 focus:ring-fizz/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.18em] text-steam">To</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-fizz border border-ink-line bg-ink px-3 py-2 text-cream outline-none focus:border-fizz focus:ring-2 focus:ring-fizz/40"
            />
          </label>
          <button
            onClick={applyCustom}
            className="rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105"
          >
            Apply
          </button>
        </div>
      )}

      {/* Headline metrics */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={money(analytics.revenue.value)} metric={analytics.revenue} primary />
        <Kpi label="Orders" value={String(analytics.orders.value)} metric={analytics.orders} />
        <Kpi label="Avg order" value={money(analytics.avgOrder.value)} metric={analytics.avgOrder} />
        <Kpi
          label="Net profit"
          value={money(analytics.netProfit.value)}
          metric={analytics.netProfit}
          good={analytics.netProfit.value >= 0}
        />
        <Kpi label="Tax collected" value={money(analytics.tax.value)} metric={analytics.tax} muted />
        <Kpi label="Discounts" value={money(analytics.discounts.value)} metric={analytics.discounts} muted invert />
        <Kpi label="Expenses" value={money(analytics.expenses.value)} metric={analytics.expenses} muted invert />
        <Kpi
          label="Busiest"
          value={analytics.busiestLabel ?? "—"}
          metric={null}
          muted
        />
      </div>

      {/* Revenue trend */}
      <Card className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold">Revenue trend</h2>
          <span className="text-xs text-steam">
            by {analytics.trendUnit === "hour" ? "hour" : "day"}
          </span>
        </div>
        <TrendChart data={analytics.trend} money={money} />
      </Card>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold">By payment method</h2>
          <SliceList slices={analytics.byPayment} money={money} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">By order type</h2>
          <SliceList slices={analytics.byType} money={money} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">Sales by category</h2>
          <SliceList slices={analytics.byCategory} money={money} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">Top items</h2>
          {analytics.topItems.length === 0 ? (
            <Empty />
          ) : (
            <ul className="mt-4 space-y-2.5">
              {analytics.topItems.map((it, i) => (
                <li key={it.name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink-line font-display text-xs text-fizz">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-cream">{it.name}</span>
                  <span className="shrink-0 text-sm text-steam">{it.units} sold</span>
                  <span className="shrink-0 font-display font-semibold text-cream">
                    {money(it.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-fizz border border-ink-line bg-ink-soft p-5 ${className}`}>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="mt-6 text-center text-sm text-steam">No data for this range.</p>;
}

// A KPI tile with a period-over-period delta chip.
function Kpi({
  label,
  value,
  metric,
  primary,
  good,
  muted,
  invert,
}: {
  label: string;
  value: string;
  metric: Metric | null;
  primary?: boolean;
  good?: boolean;
  muted?: boolean;
  invert?: boolean; // for cost metrics, "up" is bad
}) {
  const d = metric ? delta(metric) : null;
  // For cost-like metrics, an increase is unfavourable.
  const favourable = d ? (invert ? !d.up : d.up) : true;
  return (
    <div
      className={`flex flex-col justify-between rounded-fizz border p-4 sm:p-5 ${
        primary ? "border-fizz/30 bg-fizz/[0.06]" : "border-ink-line bg-ink-soft"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
        {label}
      </p>
      <p
        className={`mt-2 truncate font-display text-xl font-bold tracking-tight sm:text-2xl ${
          good === false ? "text-[#E2655A]" : muted ? "text-cream" : "text-cream"
        }`}
      >
        {value}
      </p>
      {d && (
        <p
          className={`mt-1 text-xs font-semibold ${
            favourable ? "text-fizz" : "text-[#E2655A]"
          }`}
        >
          {d.up ? "▲" : "▼"} {Math.abs(d.pct)}% vs prev
        </p>
      )}
    </div>
  );
}

// SVG bar chart for the revenue trend. Responsive via viewBox; bars scale to max.
function TrendChart({
  data,
  money,
}: {
  data: { label: string; value: number }[];
  money: (x: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <Empty />;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 800;
  const H = 220;
  const pad = 8;
  const bw = (W - pad * 2) / data.length;
  // Show ~8 evenly-spaced x labels max to avoid crowding.
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className="mt-4">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {data.map((d, i) => {
            const h = (d.value / max) * (H - 30);
            const x = pad + i * bw;
            const y = H - 20 - h;
            return (
              <rect
                key={i}
                x={x + bw * 0.12}
                y={y}
                width={bw * 0.76}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx={3}
                className={
                  hover === i ? "fill-bubble" : "fill-fizz"
                }
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-fizz border border-ink-line bg-ink px-3 py-1.5 text-sm">
            <span className="text-steam">{data[hover].label}: </span>
            <span className="font-display font-bold text-fizz">
              {money(data[hover].value)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-steam">
        {data.map((d, i) =>
          i % labelEvery === 0 ? <span key={i}>{d.label}</span> : null,
        )}
      </div>
    </div>
  );
}

// Horizontal bars + share for a breakdown slice list.
function SliceList({
  slices,
  money,
}: {
  slices: Slice[];
  money: (x: number) => string;
}) {
  if (slices.length === 0) return <Empty />;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <ul className="mt-4 space-y-3">
      {slices.map((s, i) => {
        const pct = (s.value / total) * 100;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 text-cream">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                />
                {s.label}
                <span className="text-steam">· {s.count}</span>
              </span>
              <span className="font-display font-semibold text-cream">
                {money(s.value)}
                <span className="ml-1.5 text-xs text-steam">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: SLICE_COLORS[i % SLICE_COLORS.length],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
