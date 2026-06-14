"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/store/format";
import type { HomeKpi, HomeSnapshot, RecentOrder } from "@/lib/store/home";

const TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

// Period-over-period delta vs yesterday.
function delta(m: HomeKpi): { pct: number; up: boolean } | null {
  if (m.prev === 0) return m.value === 0 ? null : { pct: 100, up: true };
  const pct = Math.round(((m.value - m.prev) / Math.abs(m.prev)) * 100);
  return { pct, up: pct >= 0 };
}

function greetingFor(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function DashboardHome({
  firstName,
  roleLabel,
  storeName,
  currency,
  openNow,
  openingTime,
  closingTime,
  canSeeInsights,
  snapshot,
  quickActions,
}: {
  firstName: string;
  roleLabel: string;
  storeName: string;
  currency: string;
  openNow: boolean;
  openingTime: string;
  closingTime: string;
  canSeeInsights: boolean;
  snapshot: HomeSnapshot;
  quickActions: { label: string; href: string; blurb: string }[];
}) {
  const money = (x: number) => formatMoney(x, currency);
  const s = snapshot;
  const revDelta = delta(s.revenueToday);

  // Time-dependent text is computed after mount to avoid SSR/client mismatch
  // (the wall clock is an external system we read once on the client).
  const [clock, setClock] = useState<{ greeting: string; now: number } | null>(
    null,
  );
  useEffect(() => {
    // Read the client wall clock once after hydration (not during render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock({ greeting: greetingFor(new Date().getHours()), now: Date.now() });
  }, []);
  const greeting = clock?.greeting ?? "Welcome";
  const now = clock?.now ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            {roleLabel} · {storeName}
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,5vw,40px)] font-bold tracking-tight">
            {greeting}, {firstName}.
          </h1>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
            openNow
              ? "border-fizz/40 bg-fizz/10 text-fizz"
              : "border-ink-line bg-ink-soft text-steam"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${openNow ? "bg-fizz animate-pulse" : "bg-steam"}`}
          />
          {openNow ? "Open now" : "Closed"} · {openingTime}–{closingTime}
        </span>
      </div>

      {/* Hero + KPIs */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Today's revenue hero with sparkline */}
        <section className="relative flex flex-col justify-between overflow-hidden rounded-fizz border border-fizz/30 bg-fizz/[0.06] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                Revenue today
              </p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
                {money(s.revenueToday.value)}
              </p>
              {revDelta ? (
                <p
                  className={`mt-1 text-sm font-semibold ${revDelta.up ? "text-fizz" : "text-[#E2655A]"}`}
                >
                  {revDelta.up ? "▲" : "▼"} {Math.abs(revDelta.pct)}% vs yesterday
                </p>
              ) : (
                <p className="mt-1 text-sm text-steam">No sales yet today</p>
              )}
            </div>
            <Link
              href="/dashboard/analytics"
              className="shrink-0 rounded-fizz border border-ink-line bg-ink/40 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
            >
              Analytics →
            </Link>
          </div>
          <Sparkline data={s.todaySpark} className="mt-6 h-16 w-full" />
          <p className="mt-1 text-[11px] text-steam">Hourly revenue · midnight → now</p>
        </section>

        {/* Today KPI stack */}
        <div className="grid grid-cols-2 gap-4">
          <Kpi label="Orders today" value={String(s.ordersToday.value)} metric={s.ordersToday} />
          <Kpi label="Avg order" value={money(s.avgToday.value)} metric={s.avgToday} />
          <Kpi
            label="Open tabs"
            value={String(s.openTabs)}
            sub={s.openTabs > 0 ? `${money(s.openTabsValue)} out` : "all settled"}
            href="/dashboard/orders"
            accent={s.openTabs > 0}
          />
          {canSeeInsights ? (
            <Kpi
              label="Low stock"
              value={String(s.lowStockCount)}
              sub={s.lowStockCount > 0 ? "needs restock" : "all good"}
              href="/dashboard/inventory"
              warn={s.lowStockCount > 0}
            />
          ) : (
            <Kpi label="This week" value={money(s.weekRevenue)} sub="revenue" />
          )}
        </div>
      </div>

      {/* Attention + week (insights only) */}
      {canSeeInsights && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          {/* Needs attention */}
          <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
            <h2 className="font-display text-lg font-bold">Needs attention</h2>
            <div className="mt-4 space-y-3">
              {s.openTabs === 0 && s.lowStockCount === 0 && (
                <p className="rounded-fizz border border-ink-line bg-ink p-4 text-sm text-steam">
                  All clear — no open tabs, stock looks healthy. ●
                </p>
              )}
              {s.openTabs > 0 && (
                <Link
                  href="/dashboard/orders"
                  className="flex items-center justify-between gap-3 rounded-fizz border border-fizz/30 bg-fizz/[0.06] p-4 transition-colors hover:border-fizz"
                >
                  <span className="text-sm text-cream">
                    <span className="font-display text-lg font-bold text-fizz">
                      {s.openTabs}
                    </span>{" "}
                    open tab{s.openTabs === 1 ? "" : "s"} to settle
                  </span>
                  <span className="font-display font-semibold text-cream">
                    {money(s.openTabsValue)}
                  </span>
                </Link>
              )}
              {s.lowStock.map((it) => (
                <Link
                  key={it.id}
                  href="/dashboard/inventory"
                  className="flex items-center justify-between gap-3 rounded-fizz border border-ink-line bg-ink p-3 transition-colors hover:border-[#E2655A]"
                >
                  <span className="truncate text-sm text-cream">{it.name}</span>
                  <span className="shrink-0 text-sm text-[#E2655A]">
                    {it.qty} {it.unit} left
                  </span>
                </Link>
              ))}
              {s.lowStockCount > s.lowStock.length && (
                <Link
                  href="/dashboard/inventory"
                  className="block text-center text-xs font-semibold text-fizz hover:underline"
                >
                  +{s.lowStockCount - s.lowStock.length} more low items →
                </Link>
              )}
            </div>
          </section>

          {/* This week bars */}
          <section className="rounded-fizz border border-ink-line bg-ink-soft p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">This week</h2>
              <span className="font-display font-bold text-fizz">
                {money(s.weekRevenue)}
              </span>
            </div>
            <WeekBars data={s.weekSpark} money={money} className="mt-4" />
          </section>
        </div>
      )}

      {/* Recent activity */}
      <section className="mt-4 rounded-fizz border border-ink-line bg-ink-soft p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-sm font-semibold text-fizz hover:underline"
          >
            View all →
          </Link>
        </div>
        {s.recent.length === 0 ? (
          <p className="mt-4 text-sm text-steam">
            No orders yet. Head to the Till to ring your first.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-line">
            {s.recent.map((o) => (
              <RecentRow key={o.id} order={o} money={money} now={now} />
            ))}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
          Jump to
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/till"
            className="rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105"
          >
            + New order
          </Link>
          {quickActions
            .filter((a) => a.href !== "/dashboard/till")
            .map((a) => (
              <Link
                key={a.href}
                href={a.href}
                title={a.blurb}
                className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
              >
                {a.label}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  metric,
  href,
  accent,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  metric?: HomeKpi;
  href?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const d = metric ? delta(metric) : null;
  const body = (
    <div
      className={`flex h-full flex-col justify-between rounded-fizz border p-4 transition-colors ${
        warn
          ? "border-[#E2655A]/40 bg-[#E2655A]/[0.06]"
          : accent
            ? "border-fizz/30 bg-fizz/[0.06]"
            : "border-ink-line bg-ink-soft"
      } ${href ? "hover:border-fizz" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
        {label}
      </p>
      <div>
        <p className="font-display text-2xl font-bold tracking-tight text-cream">
          {value}
        </p>
        {d ? (
          <p className={`text-xs font-semibold ${d.up ? "text-fizz" : "text-[#E2655A]"}`}>
            {d.up ? "▲" : "▼"} {Math.abs(d.pct)}%
          </p>
        ) : sub ? (
          <p className={`text-xs ${warn ? "text-[#E2655A]" : "text-steam"}`}>{sub}</p>
        ) : null}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

function RecentRow({
  order,
  money,
  now,
}: {
  order: RecentOrder;
  money: (x: number) => string;
  now: number | null;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-cream">{order.number}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
              order.status === "open"
                ? "border-fizz/40 bg-fizz/10 text-fizz"
                : "border-ink-line bg-ink text-steam"
            }`}
          >
            {order.status === "open" ? "Open" : "Paid"}
          </span>
        </div>
        <p className="truncate text-xs text-steam">
          {TYPE_LABEL[order.type] ?? order.type}
          {order.reference ? ` · ${order.reference}` : ""} · {order.itemCount} item
          {order.itemCount === 1 ? "" : "s"}
          {now !== null ? ` · ${timeAgo(order.at, now)}` : ""}
        </p>
      </div>
      <span className="shrink-0 font-display font-semibold text-cream">
        {money(order.total)}
      </span>
    </li>
  );
}

// Minimal SVG area sparkline for today's hourly revenue.
function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1);
  const W = 300;
  const H = 60;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((v, i) => [i * step, H - (v / max) * (H - 4) - 2] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `M0,${H} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${W},${H} Z`;
  const allZero = data.every((v) => v === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6F432" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C6F432" stopOpacity="0" />
        </linearGradient>
      </defs>
      {!allZero && <path d={area} fill="url(#sparkFill)" />}
      <path
        d={line}
        fill="none"
        className={allZero ? "stroke-ink-line" : "stroke-fizz"}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// This-week daily bars with labels.
function WeekBars({
  data,
  money,
  className,
}: {
  data: { label: string; value: number }[];
  money: (x: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={className}>
      <div className="flex h-32 items-end gap-2">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] font-semibold text-steam opacity-0 transition-opacity group-hover:opacity-100">
                {money(d.value)}
              </span>
              <div
                className={`w-full rounded-t-md ${d.value > 0 ? "bg-fizz" : "bg-ink-line"}`}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-steam">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
