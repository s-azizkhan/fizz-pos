import type { ReactNode } from "react";

// Shared, brand-consistent control primitives. One look for every filter,
// toggle, segmented selector, and slider across the dashboard. Soft-active
// chips (lime tint, not a loud fill) keep dense control bars calm.

export function Chip({
  active,
  onClick,
  title,
  tone = "fizz",
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  tone?: "fizz" | "danger";
  children: ReactNode;
}) {
  const cls =
    tone === "danger"
      ? active
        ? "border-[#E2655A] bg-[#E2655A]/10 text-[#E2655A]"
        : "border-ink-line text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
      : active
        ? "border-fizz bg-fizz/10 text-fizz"
        : "border-ink-line text-cream hover:border-fizz/50";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

// Horizontal control bar: optional label, then wrapping chips/children.
export function ChipBar({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && (
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-steam">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

// Vertical labelled section (used in the export modal's control column).
export function ControlSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        {label}
      </span>
      {children}
    </div>
  );
}

// Range slider with a live value pill.
export function ValueSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm text-cream">
        {label}
        <span className="rounded-full bg-ink-soft px-2 py-0.5 text-xs font-semibold text-fizz">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        onKeyUp={onCommit}
        className="w-full accent-[#C6F432]"
        aria-label={label}
      />
    </label>
  );
}

// Compact search box matching the brand inputs.
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steam">
        ⌕
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-ink-line bg-ink-soft py-2 pl-8 pr-3 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
      />
    </div>
  );
}
