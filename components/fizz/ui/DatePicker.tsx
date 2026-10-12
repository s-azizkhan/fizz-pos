"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { fromDateInput, toDateInput } from "@/lib/store/date-range";
import { CalendarIcon } from "@/components/fizz/dashboard/icons";

// Fizz's own date + month pickers. Values are plain strings — YYYY-MM-DD for
// days, YYYY-MM for months — matching the `date` columns and URL params, so
// ISO string comparison doubles as date comparison for min/max.
//
// Keyboard: arrows move, PageUp/PageDown jump a month (a year in the month
// grid), Home/End jump to week edges, Enter picks, Esc closes.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Hand-rolled formatting (not Intl) so server and client render identically.
export function formatDay(v: string): string {
  const d = fromDateInput(v);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function formatMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTHS[mo - 1]} ${y}`;
}

export function shiftMonth(m: string, by: number): string {
  const [y, mo] = m.split("-").map(Number);
  return toDateInput(new Date(y, mo - 1 + by, 1)).slice(0, 7);
}

function addDays(v: string, n: number): string {
  const d = fromDateInput(v);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}

function clamp(v: string, min?: string, max?: string): string {
  if (min && v < min) return min;
  if (max && v > max) return max;
  return v;
}

const outOfRange = (v: string, min?: string, max?: string) =>
  (!!min && v < min) || (!!max && v > max);

// ── Shared bits ────────────────────────────────────────────────────────────

const triggerCls =
  "flex w-full items-center justify-between gap-3 rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-left text-cream outline-none transition-colors hover:border-fizz/50 focus-visible:border-fizz focus-visible:ring-2 focus-visible:ring-fizz/40";

const navBtnCls =
  "grid h-8 w-8 place-items-center rounded-full text-steam outline-none transition-colors hover:bg-ink-line hover:text-cream focus-visible:ring-2 focus-visible:ring-fizz disabled:pointer-events-none disabled:opacity-30";

const quickCls =
  "rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-cream outline-none transition-colors hover:border-fizz/50 hover:text-fizz focus-visible:ring-2 focus-visible:ring-fizz disabled:pointer-events-none disabled:opacity-30";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={dir === "left" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Floating panel portalled to <body> so modals' overflow can't clip it.
// Opens below the anchor, flips above when there's no room, stays on-screen.
function Popover({
  anchor,
  open,
  onClose,
  label,
  children,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const left = Math.max(8, Math.min(a.left, innerWidth - w - 8));
      const below = a.bottom + 6;
      const top = below + h > innerHeight - 8 && a.top - 6 - h > 8 ? a.top - 6 - h : below;
      setPos((cur) => (cur?.top === top && cur.left === left ? cur : { top, left }));
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) closeRef.current();
    };
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onDown);
      setPos(null);
    };
  }, [open, anchor]);

  if (!open) return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={label}
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
      className="fixed z-[60] w-[19rem] rounded-fizz border border-ink-line bg-ink p-3 text-cream"
      onKeyDown={(e) => {
        // Esc closes the picker only — not the modal it sits in.
        if (e.key === "Escape" || e.key === "Tab") {
          if (e.key === "Escape") e.preventDefault();
          e.stopPropagation();
          closeRef.current();
          anchor.current?.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── Month grid (used by both pickers) ──────────────────────────────────────

function MonthGrid({
  selected,
  min,
  max,
  onPick,
}: {
  selected: string; // YYYY-MM
  min?: string; // YYYY-MM
  max?: string; // YYYY-MM
  onPick: (m: string) => void;
}) {
  const [year, setYear] = useState(Number(selected.slice(0, 4)));
  const [focus, setFocus] = useState(selected);
  const grid = useRef<HTMLDivElement>(null);
  const thisMonth = toDateInput(new Date()).slice(0, 7);
  const ym = (mo: number) => `${year}-${String(mo + 1).padStart(2, "0")}`;
  const tabMonth = focus.startsWith(String(year)) ? focus : ym(0);

  useEffect(() => {
    grid.current?.querySelector<HTMLElement>(`[data-month="${focus}"]`)?.focus();
  }, [focus]);

  function onKey(e: KeyboardEvent) {
    const from = (e.target as HTMLElement).dataset.month;
    if (!from) return;
    const step: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12,
    };
    if (!(e.key in step)) return;
    e.preventDefault();
    const next = clamp(shiftMonth(from, step[e.key]), min, max);
    setYear(Number(next.slice(0, 4)));
    setFocus(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" className={navBtnCls} aria-label="Previous year" disabled={!!min && year <= Number(min.slice(0, 4))} onClick={() => setYear((y) => y - 1)}>
          <Chevron dir="left" />
        </button>
        <span className="font-display text-base font-bold" aria-live="polite">{year}</span>
        <button type="button" className={navBtnCls} aria-label="Next year" disabled={!!max && year >= Number(max.slice(0, 4))} onClick={() => setYear((y) => y + 1)}>
          <Chevron dir="right" />
        </button>
      </div>
      <div ref={grid} className="mt-3 grid grid-cols-3 gap-1.5" onKeyDown={onKey}>
        {MONTHS.map((name, i) => {
          const m = ym(i);
          const isSel = m === selected;
          const isNow = m === thisMonth;
          return (
            <button
              key={m}
              type="button"
              data-month={m}
              tabIndex={m === tabMonth ? 0 : -1}
              disabled={outOfRange(m, min, max)}
              aria-pressed={isSel}
              onClick={() => onPick(m)}
              className={`rounded-fizz py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fizz disabled:pointer-events-none disabled:text-steam/30 ${
                isSel
                  ? "bg-fizz font-semibold text-ink"
                  : isNow
                    ? "text-fizz ring-1 ring-inset ring-fizz/50 hover:bg-ink-line"
                    : "text-cream hover:bg-ink-line"
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day panel ──────────────────────────────────────────────────────────────

function DayPanel({
  value,
  min,
  max,
  onPick,
}: {
  value: string;
  min?: string;
  max?: string;
  onPick: (v: string) => void;
}) {
  const [view, setView] = useState(value.slice(0, 7));
  const [focus, setFocus] = useState(value);
  const [mode, setMode] = useState<"days" | "months">("days");
  const grid = useRef<HTMLDivElement>(null);
  const today = toDateInput(new Date());
  const yesterday = addDays(today, -1);

  // Always 6 rows, Monday-first, so the panel never changes height.
  const first = `${view}-01`;
  const offset = (fromDateInput(first).getDay() + 6) % 7;
  const start = addDays(first, -offset);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const tabDay = focus.startsWith(view) ? focus : first;

  useEffect(() => {
    if (mode === "days") grid.current?.querySelector<HTMLElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, mode]);

  function onKey(e: KeyboardEvent) {
    const from = (e.target as HTMLElement).dataset.day;
    if (!from) return;
    const dow = (fromDateInput(from).getDay() + 6) % 7;
    let next: string;
    switch (e.key) {
      case "ArrowLeft": next = addDays(from, -1); break;
      case "ArrowRight": next = addDays(from, 1); break;
      case "ArrowUp": next = addDays(from, -7); break;
      case "ArrowDown": next = addDays(from, 7); break;
      case "Home": next = addDays(from, -dow); break;
      case "End": next = addDays(from, 6 - dow); break;
      case "PageUp":
      case "PageDown": {
        const m = shiftMonth(from.slice(0, 7), e.key === "PageUp" ? -1 : 1);
        const [y, mo] = m.split("-").map(Number);
        const last = new Date(y, mo, 0).getDate();
        next = `${m}-${String(Math.min(Number(from.slice(8)), last)).padStart(2, "0")}`;
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    next = clamp(next, min, max);
    setView(next.slice(0, 7));
    setFocus(next);
  }

  if (mode === "months") {
    return (
      <MonthGrid
        selected={view}
        min={min?.slice(0, 7)}
        max={max?.slice(0, 7)}
        onPick={(m) => {
          setView(m);
          setFocus(clamp(`${m}-01`, min, max));
          setMode("days");
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" className={navBtnCls} aria-label="Previous month" disabled={!!min && view <= min.slice(0, 7)} onClick={() => setView((v) => shiftMonth(v, -1))}>
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          onClick={() => setMode("months")}
          aria-label={`${formatMonth(view)} — choose month`}
          className="rounded-full px-3 py-1 font-display text-base font-bold outline-none transition-colors hover:bg-ink-line focus-visible:ring-2 focus-visible:ring-fizz"
          aria-live="polite"
        >
          {formatMonth(view)}
        </button>
        <button type="button" className={navBtnCls} aria-label="Next month" disabled={!!max && view >= max.slice(0, 7)} onClick={() => setView((v) => shiftMonth(v, 1))}>
          <Chevron dir="right" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-steam">
        {DOW.map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div ref={grid} role="grid" className="grid grid-cols-7 gap-y-1" onKeyDown={onKey}>
        {days.map((d) => {
          const inMonth = d.startsWith(view);
          const isSel = d === value;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              data-day={d}
              tabIndex={d === tabDay ? 0 : -1}
              disabled={outOfRange(d, min, max)}
              aria-pressed={isSel}
              aria-label={formatDay(d)}
              onClick={() => onPick(d)}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fizz disabled:pointer-events-none disabled:text-steam/25 ${
                isSel
                  ? "bg-fizz font-semibold text-ink"
                  : isToday
                    ? "font-semibold text-fizz ring-1 ring-inset ring-fizz/50 hover:bg-ink-line"
                    : inMonth
                      ? "text-cream hover:bg-ink-line"
                      : "text-steam/50 hover:bg-ink-line"
              }`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2 border-t border-ink-line pt-3">
        <button type="button" className={quickCls} disabled={outOfRange(today, min, max)} onClick={() => onPick(today)}>
          Today
        </button>
        <button type="button" className={quickCls} disabled={outOfRange(yesterday, min, max)} onClick={() => onPick(yesterday)}>
          Yesterday
        </button>
      </div>
    </div>
  );
}

// ── Public pickers ─────────────────────────────────────────────────────────

// Single-day picker. Controlled (`value` + `onChange`) or uncontrolled
// (`defaultValue`); with `name` it posts YYYY-MM-DD through a hidden input.
export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  className = triggerCls,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [inner, setInner] = useState(() => defaultValue ?? toDateInput(new Date()));
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function pick(v: string) {
    setInner(v);
    onChange?.(v);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${formatDay(current)}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={className}
      >
        <span className="truncate">{formatDay(current)}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-steam" />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} label="Choose date">
        <DayPanel value={current} min={min} max={max} onPick={pick} />
      </Popover>
    </>
  );
}

// Month stepper: ‹ [October 2026] › — arrows step a month, the label opens a
// month grid for longer jumps.
export function MonthPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: string; // YYYY-MM
  onChange: (m: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const thisMonth = toDateInput(new Date()).slice(0, 7);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-ink-line bg-ink-soft p-0.5">
      <button type="button" className={navBtnCls} aria-label="Previous month" disabled={!!min && value <= min} onClick={() => onChange(shiftMonth(value, -1))}>
        <Chevron dir="left" />
      </button>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${formatMonth(value)} — choose month`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-cream outline-none transition-colors hover:bg-ink-line focus-visible:ring-2 focus-visible:ring-fizz"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-steam" />
        {formatMonth(value)}
      </button>
      <button type="button" className={navBtnCls} aria-label="Next month" disabled={!!max && value >= max} onClick={() => onChange(shiftMonth(value, 1))}>
        <Chevron dir="right" />
      </button>
      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} label="Choose month">
        <MonthGrid
          selected={value}
          min={min}
          max={max}
          onPick={(m) => {
            setOpen(false);
            trigger.current?.focus();
            onChange(m);
          }}
        />
        <div className="mt-3 flex gap-2 border-t border-ink-line pt-3">
          {[
            ["This month", thisMonth],
            ["Last month", shiftMonth(thisMonth, -1)],
          ].map(([label, m]) => (
            <button
              key={label}
              type="button"
              className={quickCls}
              disabled={outOfRange(m, min, max)}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
                onChange(m);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
