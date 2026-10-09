"use client";

// On-screen number pad. Stateless: it only reports key presses, so it can
// drive a NumberInput, a cash-tendered screen, a PIN field — anything.
// Buttons swallow pointerdown so the focused input never loses focus (no
// blur → no close, and the phone keyboard never pops up).

export type KeypadKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "." | "back" | "clear" | "done";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export default function Keypad({
  onKey,
  decimal = true,
  className = "",
}: {
  onKey: (key: KeypadKey) => void;
  decimal?: boolean; // show the "." key
  className?: string;
}) {
  const key = (k: KeypadKey, label: string, cls = "") => (
    <button
      key={k}
      type="button"
      tabIndex={-1}
      aria-label={k === "back" ? "Backspace" : label}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => onKey(k)}
      className={`h-12 rounded-fizz border border-ink-line font-display text-xl font-semibold transition-colors active:scale-95 ${cls || "bg-ink text-cream hover:border-fizz/50"}`}
    >
      {label}
    </button>
  );

  return (
    <div
      onPointerDown={(e) => e.preventDefault()}
      className={`grid select-none grid-cols-3 gap-2 rounded-fizz border border-ink-line bg-ink-soft p-2 ${className}`}
    >
      {DIGITS.map((d) => key(d, d))}
      {decimal ? key(".", ".") : <span />}
      {key("0", "0")}
      {key("back", "⌫", "bg-ink text-steam hover:border-fizz/50 hover:text-cream")}
      {key("clear", "Clear", "bg-ink text-sm text-steam hover:border-[#E2655A] hover:text-[#E2655A]")}
      {key("done", "Done", "col-span-2 border-fizz bg-fizz text-base text-ink")}
    </div>
  );
}
