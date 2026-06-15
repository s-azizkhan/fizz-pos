"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/store/format";
import { PRESET_LABELS, PRESET_ORDER, type RangePreset } from "@/lib/store/date-range";
import { Chip, ChipBar } from "@/components/fizz/ui/controls";
import type { Analytics, Metric, SeriesPoint, Slice } from "@/lib/store/analytics";

// Percentage change between current and previous, guarding divide-by-zero.
function delta(m: Metric): { pct: number; up: boolean } | null {
  if (m.prev === 0) return m.value === 0 ? null : { pct: 100, up: true };
  const pct = ((m.value - m.prev) / Math.abs(m.prev)) * 100;
  return { pct: Math.round(pct), up: pct >= 0 };
}

const SLICE_COLORS = ["#C6F432", "#38E1D6", "#8A93A1", "#E2655A", "#6b7280"];

// Revenue-trend chart styles. "candles" is the stock-market OHLC view.
type ChartType = "candles" | "line" | "area" | "bars";
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candles", label: "Candles" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "bars", label: "Bars" },
];

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
  const [chartType, setChartType] = useState<ChartType>("candles");

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
      <ChipBar className="mt-6">
        {PRESET_ORDER.map((p) => (
          <Chip
            key={p}
            active={preset === p && !showCustom}
            onClick={() => applyPreset(p)}
          >
            {PRESET_LABELS[p]}
          </Chip>
        ))}
        <Chip
          active={preset === "custom" || showCustom}
          onClick={() => setShowCustom((v) => !v)}
        >
          Custom range
        </Chip>
      </ChipBar>

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-lg font-bold">Revenue trend</h2>
            <span className="text-xs text-steam">
              by {analytics.trendUnit === "hour" ? "hour" : "day"}
            </span>
          </div>
          {/* Chart-type toggle (stock-market style: candles) */}
          <ChipBar>
            {CHART_TYPES.map((c) => (
              <Chip
                key={c.value}
                active={chartType === c.value}
                onClick={() => setChartType(c.value)}
                title={c.label}
              >
                {c.label}
              </Chip>
            ))}
          </ChipBar>
        </div>
        {chartType === "candles" ? (
          <CandleChart data={analytics.trend} unit={analytics.trendUnit} money={money} />
        ) : (
          <TrendChart
            data={analytics.trend}
            money={money}
            mode={chartType}
          />
        )}
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

// Shared chart geometry.
const CHART_W = 800;
const CHART_H = 240;
const CHART_PAD_L = 8;
const CHART_PAD_R = 8;
const CHART_PAD_T = 12;
const CHART_PAD_B = 22;

// Build "nice" gridline values from 0..max (≈4 lines).
function gridLines(max: number): number[] {
  if (max <= 0) return [0];
  const step = niceStep(max / 4);
  const out: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

// Y-axis + gridline layer shared by all chart types.
function Grid({ max, money }: { max: number; money: (x: number) => string }) {
  const lines = gridLines(max);
  const plotH = CHART_H - CHART_PAD_T - CHART_PAD_B;
  return (
    <>
      {lines.map((v) => {
        const y = CHART_PAD_T + plotH - (v / (max || 1)) * plotH;
        return (
          <g key={v}>
            <line
              x1={CHART_PAD_L}
              x2={CHART_W - CHART_PAD_R}
              y1={y}
              y2={y}
              className="stroke-ink-line"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text
              x={CHART_W - CHART_PAD_R}
              y={y - 3}
              textAnchor="end"
              className="fill-steam"
              style={{ fontSize: 10 }}
            >
              {money(v)}
            </text>
          </g>
        );
      })}
    </>
  );
}

// SVG chart for the revenue trend in bars / line / area mode (gridlines + axis).
function TrendChart({
  data,
  money,
  mode,
}: {
  data: SeriesPoint[];
  money: (x: number) => string;
  mode: "bars" | "line" | "area";
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0 || data.every((d) => d.value === 0)) return <Empty />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const gMax = gridLines(max).at(-1) || max;
  const W = CHART_W;
  const H = CHART_H;
  const plotH = H - CHART_PAD_T - CHART_PAD_B;
  const innerW = W - CHART_PAD_L - CHART_PAD_R;
  const bw = innerW / data.length;
  const labelEvery = Math.ceil(data.length / 8);
  const x = (i: number) => CHART_PAD_L + i * bw + bw / 2;
  const y = (v: number) => CHART_PAD_T + plotH - (v / gMax) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath =
    `M${x(0)},${y(0)} ` +
    data.map((d, i) => `L${x(i)},${y(d.value)}`).join(" ") +
    ` L${x(data.length - 1)},${y(0)} Z`;

  return (
    <div className="mt-4">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <Grid max={gMax} money={money} />

          {mode === "bars" &&
            data.map((d, i) => {
              const h = (d.value / gMax) * plotH;
              return (
                <rect
                  key={i}
                  x={CHART_PAD_L + i * bw + bw * 0.15}
                  y={CHART_PAD_T + plotH - h}
                  width={bw * 0.7}
                  height={Math.max(h, d.value > 0 ? 2 : 0)}
                  rx={3}
                  className={hover === i ? "fill-bubble" : "fill-fizz"}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}

          {mode === "area" && (
            <>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6F432" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#C6F432" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#areaFill)" />
              <path d={linePath} fill="none" className="stroke-fizz" strokeWidth={2} />
            </>
          )}

          {mode === "line" && (
            <path d={linePath} fill="none" className="stroke-fizz" strokeWidth={2} />
          )}

          {/* Hover hotspots + markers for line/area */}
          {data.map((d, i) => (
            <g key={`h${i}`}>
              {mode !== "bars" && hover === i && (
                <circle cx={x(i)} cy={y(d.value)} r={4} className="fill-bubble" />
              )}
              <rect
                x={CHART_PAD_L + i * bw}
                y={CHART_PAD_T}
                width={bw}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
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

// Stock-market style candlestick chart. Each candle is the OHLC of individual
// order totals within a bucket: green when close >= open (orders trended up),
// red otherwise. Wicks show the high/low order value; the body spans open→close.
function CandleChart({
  data,
  unit,
  money,
}: {
  data: SeriesPoint[];
  unit: "hour" | "day";
  money: (x: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = data.filter((d) => d.count > 0);
  if (active.length === 0) return <Empty />;

  const hi = Math.max(...data.map((d) => d.high), 1);
  const gMax = gridLines(hi).at(-1) || hi;
  const W = CHART_W;
  const H = CHART_H;
  const plotH = H - CHART_PAD_T - CHART_PAD_B;
  const innerW = W - CHART_PAD_L - CHART_PAD_R;
  const bw = innerW / data.length;
  const labelEvery = Math.ceil(data.length / 8);
  const cx = (i: number) => CHART_PAD_L + i * bw + bw / 2;
  const y = (v: number) => CHART_PAD_T + plotH - (v / gMax) * plotH;
  const bodyW = Math.max(2, Math.min(16, bw * 0.6));

  return (
    <div className="mt-4">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <Grid max={gMax} money={money} />
          {data.map((d, i) => {
            if (d.count === 0) return null;
            const up = d.close >= d.open;
            const color = up ? "#C6F432" : "#E2655A";
            const bodyTop = y(Math.max(d.open, d.close));
            const bodyBot = y(Math.min(d.open, d.close));
            const bodyH = Math.max(2, bodyBot - bodyTop);
            const x = cx(i);
            return (
              <g
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Wick (high → low) */}
                <line
                  x1={x}
                  x2={x}
                  y1={y(d.high)}
                  y2={y(d.low)}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Body (open → close) */}
                <rect
                  x={x - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  rx={1.5}
                  fill={color}
                  opacity={hover === i ? 1 : 0.9}
                />
                {/* hover hotspot */}
                <rect
                  x={CHART_PAD_L + i * bw}
                  y={CHART_PAD_T}
                  width={bw}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
        {hover !== null && data[hover].count > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-fizz border border-ink-line bg-ink px-3 py-2 text-xs">
            <p className="font-semibold text-cream">{data[hover].label}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-steam">
              <span>Open</span><span className="text-right text-cream">{money(data[hover].open)}</span>
              <span>High</span><span className="text-right text-fizz">{money(data[hover].high)}</span>
              <span>Low</span><span className="text-right text-[#E2655A]">{money(data[hover].low)}</span>
              <span>Close</span><span className="text-right text-cream">{money(data[hover].close)}</span>
              <span>Orders</span><span className="text-right text-cream">{data[hover].count}</span>
              <span>Revenue</span><span className="text-right text-cream">{money(data[hover].value)}</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <div className="flex gap-3 text-[10px] text-steam">
          {data.map((d, i) =>
            i % labelEvery === 0 ? <span key={i}>{d.label}</span> : null,
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-steam">
        Each candle = order-value range that {unit}. Green: order values rose
        (close ≥ open) · Red: fell. Wick = highest/lowest single order.
      </p>
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
