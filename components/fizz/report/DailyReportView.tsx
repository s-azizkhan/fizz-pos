"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/store/format";
import type { DailyReport, DayInsight } from "@/lib/store/daily-report";
import type { Metric, Slice } from "@/lib/store/analytics";

function delta(m: Metric): { pct: number; up: boolean } | null {
  if (m.prev === 0) return m.value === 0 ? null : { pct: 100, up: true };
  return {
    pct: Math.round(((m.value - m.prev) / Math.abs(m.prev)) * 100),
    up: m.value >= m.prev,
  };
}

const INSIGHT_STYLE: Record<DayInsight["kind"], { ring: string; dot: string; tag: string }> = {
  good: { ring: "border-fizz/40 bg-fizz/[0.06]", dot: "bg-fizz", tag: "text-fizz" },
  warn: { ring: "border-[#E2655A]/40 bg-[#E2655A]/[0.06]", dot: "bg-[#E2655A]", tag: "text-[#E2655A]" },
  info: { ring: "border-ink-line bg-ink", dot: "bg-bubble", tag: "text-bubble" },
};

export default function DailyReportView({
  report,
  currency,
  storeName,
}: {
  report: DailyReport;
  currency: string;
  storeName: string;
}) {
  const money = (x: number) => formatMoney(x, currency);
  const a = report.analytics;

  // Print-friendly: tag the body so the print stylesheet can hide app chrome.
  useEffect(() => {
    document.body.classList.add("report-print");
    return () => document.body.classList.remove("report-print");
  }, []);

  return (
    <div className="report-root mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Daily report · {storeName}
          </p>
          <h1 className="mt-2 font-display text-[clamp(24px,4vw,38px)] font-bold tracking-tight">
            Today
          </h1>
          <p className="mt-1 text-steam">{report.dateLabel}</p>
        </div>
        <div className="report-actions flex gap-2">
          <Link
            href="/dashboard/analytics?range=today"
            className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Full analytics →
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105"
          >
            Print
          </button>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={money(a.revenue.value)} metric={a.revenue} primary />
        <Kpi label="Orders" value={String(a.orders.value)} metric={a.orders} />
        <Kpi label="Avg order" value={money(a.avgOrder.value)} metric={a.avgOrder} />
        <Kpi
          label="Net profit"
          value={money(a.netProfit.value)}
          metric={a.netProfit}
          bad={a.netProfit.value < 0}
        />
      </div>

      {/* Actionable insights */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
          What to do
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {report.insights.map((ins, i) => {
            const st = INSIGHT_STYLE[ins.kind];
            const inner = (
              <div className={`flex h-full gap-3 rounded-fizz border p-4 ${st.ring}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                <div>
                  <p className="font-semibold text-cream">{ins.title}</p>
                  <p className="mt-0.5 text-sm text-steam">{ins.detail}</p>
                  {ins.href && (
                    <span className={`mt-1 inline-block text-xs font-semibold ${st.tag}`}>
                      Go →
                    </span>
                  )}
                </div>
              </div>
            );
            return ins.href ? (
              <Link key={i} href={ins.href} className="block">
                {inner}
              </Link>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Cash up + day shape */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Cash drawer reconciliation */}
        <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <h2 className="font-display text-lg font-bold">Cash up</h2>
          <p className="mt-1 text-sm text-steam">
            What the till should hold from today&apos;s cash sales.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Cash sales" value={money(report.cashSales)} />
            <Row label="Card / online" value={money(a.revenue.value - report.cashSales)} muted />
            <Row label="Discounts given" value={money(a.discounts.value)} muted />
            <Row label="Tax collected" value={money(a.tax.value)} muted />
            <div className="!mt-3 flex items-center justify-between border-t border-ink-line pt-3">
              <dt className="font-semibold text-cream">Expected cash in drawer</dt>
              <dd className="font-display text-xl font-bold text-fizz">
                {money(report.cashSales)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Day shape */}
        <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <h2 className="font-display text-lg font-bold">Day shape</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Mini label="Busiest hour" value={report.peakHour ? report.peakHour.label : "—"} />
            <Mini label="Quietest hour" value={report.quietHour ? report.quietHour.label : "—"} />
            <Mini label="First sale" value={report.firstSale ?? "—"} />
            <Mini label="Last sale" value={report.lastSale ?? "—"} />
            <Mini label="Open tabs" value={`${report.openTabs} · ${money(report.openTabsValue)}`} warn={report.openTabs > 0} />
            <Mini label="Voided" value={String(report.voided)} warn={report.voided > 0} />
          </dl>
        </section>
      </div>

      {/* Hourly revenue */}
      <section className="mt-6 rounded-fizz border border-ink-line bg-ink-soft p-5">
        <h2 className="font-display text-lg font-bold">Revenue by hour</h2>
        <HourBars
          data={a.trend.map((t) => ({ label: t.label, value: t.value }))}
          money={money}
          className="mt-4"
        />
      </section>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By payment method" slices={a.byPayment} money={money} />
        <Panel title="By order type" slices={a.byType} money={money} />
        <Panel title="By category" slices={a.byCategory} money={money} />
        <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <h2 className="font-display text-lg font-bold">Top items today</h2>
          {a.topItems.length === 0 ? (
            <p className="mt-4 text-sm text-steam">No items sold yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {a.topItems.map((it, i) => (
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
        </section>
      </div>

      <p className="report-actions mt-6 text-xs text-steam">
        Generated for {report.dateLabel}. Figures cover settled (paid) orders;
        open tabs are excluded from revenue until settled.
      </p>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body.report-print .report-actions {
            display: none !important;
          }
          body.report-print {
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
}

function Kpi({
  label,
  value,
  metric,
  primary,
  bad,
}: {
  label: string;
  value: string;
  metric: Metric;
  primary?: boolean;
  bad?: boolean;
}) {
  const d = delta(metric);
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
          bad ? "text-[#E2655A]" : "text-cream"
        }`}
      >
        {value}
      </p>
      {d ? (
        <p className={`mt-1 text-xs font-semibold ${d.up ? "text-fizz" : "text-[#E2655A]"}`}>
          {d.up ? "▲" : "▼"} {Math.abs(d.pct)}% vs yesterday
        </p>
      ) : (
        <p className="mt-1 text-xs text-steam">vs yesterday</p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-steam">{label}</dt>
      <dd className={muted ? "text-cream" : "font-semibold text-cream"}>{value}</dd>
    </div>
  );
}

function Mini({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-steam">{label}</dt>
      <dd className={`mt-0.5 font-display font-bold ${warn ? "text-[#E2655A]" : "text-cream"}`}>
        {value}
      </dd>
    </div>
  );
}

const SLICE_COLORS = ["#C6F432", "#38E1D6", "#8A93A1", "#E2655A", "#6b7280"];

function Panel({
  title,
  slices,
  money,
}: {
  title: string;
  slices: Slice[];
  money: (x: number) => string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {slices.length === 0 ? (
        <p className="mt-4 text-sm text-steam">No data yet.</p>
      ) : (
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
                    style={{ width: `${pct}%`, background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HourBars({
  data,
  money,
  className,
}: {
  data: { label: string; value: number }[];
  money: (x: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.every((d) => d.value === 0)) {
    return <p className="mt-4 text-sm text-steam">No sales recorded yet today.</p>;
  }
  return (
    <div className={className}>
      <div className="flex h-40 items-end gap-0.5">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
              <div
                className={`w-full rounded-t-[3px] ${d.value > 0 ? "bg-fizz" : "bg-ink-line"}`}
                style={{ height: `${Math.max(pct, d.value > 0 ? 3 : 1)}%` }}
              />
              {d.value > 0 && (
                <span className="pointer-events-none absolute -top-5 hidden whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-fizz group-hover:block">
                  {money(d.value)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-0.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-steam">
            {i % 3 === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
