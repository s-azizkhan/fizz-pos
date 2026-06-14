// Pure date-range helpers for analytics filters. No server deps so the client
// filter UI and the server query share identical boundary logic. All ranges
// are [start, end) — start inclusive, end exclusive — at local midnight.

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export type DateRange = { start: Date; end: Date };

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  custom: "Custom",
};

// Order presets surface in the filter bar.
export const PRESET_ORDER: RangePreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
];

function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Week starts Monday (ISO). Returns Monday 00:00 of `d`'s week.
function startOfWeek(d: Date): Date {
  const x = atMidnight(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  return addDays(x, -day);
}

// Resolve a preset to a concrete [start, end) range. `now` defaults to today;
// pass it for deterministic tests.
export function resolvePreset(preset: RangePreset, now = new Date()): DateRange {
  const today = atMidnight(now);
  switch (preset) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "yesterday":
      return { start: addDays(today, -1), end: today };
    case "this_week": {
      const s = startOfWeek(today);
      return { start: s, end: addDays(s, 7) };
    }
    case "last_week": {
      const s = addDays(startOfWeek(today), -7);
      return { start: s, end: addDays(s, 7) };
    }
    case "this_month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start: s, end: e };
    }
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: s, end: e };
    }
    case "this_year": {
      const s = new Date(today.getFullYear(), 0, 1);
      const e = new Date(today.getFullYear() + 1, 0, 1);
      return { start: s, end: e };
    }
    default:
      return { start: today, end: addDays(today, 1) };
  }
}

// The immediately-preceding range of equal length, for period-over-period
// comparison (e.g. this week vs last week).
export function previousRange(range: DateRange): DateRange {
  const ms = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - ms), end: range.start };
}

// YYYY-MM-DD in local time (for <input type=date> and date columns).
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD as local midnight.
export function fromDateInput(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Whole days spanned by a range (used to choose daily vs hourly bucketing).
export function rangeDays(range: DateRange): number {
  return Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000),
  );
}
