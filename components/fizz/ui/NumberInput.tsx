"use client";

import { useRef, useState, type ReactNode } from "react";
import Keypad, { type KeypadKey } from "./Keypad";

// Brand number field with Fizz's own on-screen keypad. On touch devices focus
// opens the keypad right under the field; inputMode="none" keeps the phone keyboard shut, while
// a hardware keyboard still types normally. The value is a string (like every
// money column) so "12." survives mid-entry; the form posts it via `name`.
//
// Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number; // stepper / arrow-key increment
  decimals?: number; // max fraction digits; 0 = integers only
  prefix?: ReactNode; // e.g. currencySymbol(currency)
  suffix?: ReactNode; // e.g. "kg", "%"
  stepper?: boolean; // show − / + buttons
  keypad?: boolean; // on-screen keypad (default on)
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

export default function NumberInput({
  name,
  value,
  defaultValue = "",
  onChange,
  min = 0,
  max,
  step = 1,
  decimals = 2,
  prefix,
  suffix,
  stepper = false,
  keypad = true,
  required,
  disabled,
  placeholder = "0",
  id,
  "aria-label": ariaLabel,
  className = "",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(String(defaultValue));
  const [open, setOpen] = useState(false);
  // First keypad press replaces the value (calculator-style), later ones append.
  const [fresh, setFresh] = useState(true);
  const current = value ?? inner;

  const set = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));
  const tidy = (n: number) => String(Number(clamp(n).toFixed(decimals)));

  // Keep only what can become a valid number: digits, one dot (if decimals),
  // a leading minus (if min < 0), at most `decimals` fraction digits, and no
  // leading zeros ("007" → "7", "0.5" stays).
  const sanitize = (raw: string) => {
    const neg = min < 0 && raw.trimStart().startsWith("-");
    let s = raw.replace(decimals > 0 ? /[^\d.]/g : /\D/g, "");
    const dot = s.indexOf(".");
    if (dot !== -1) {
      s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
    }
    s = s.replace(/^0+(?=\d)/, "").replace(/^\./, "0.");
    return (neg ? "-" : "") + s;
  };

  const bump = (dir: 1 | -1) => {
    set(tidy((Number(current) || 0) + dir * step));
    setFresh(false);
  };

  const press = (k: KeypadKey) => {
    if (k === "done") return ref.current?.blur();
    if (k === "clear") return (set(""), setFresh(false));
    const base = fresh ? "" : current;
    const next = k === "back" ? base.slice(0, -1) : sanitize(base + k);
    if (max !== undefined && Number(next) > max) return; // ignore, don't clamp mid-entry
    set(next);
    setFresh(false);
  };

  const btnCls =
    "grid h-full w-10 shrink-0 place-items-center text-lg font-semibold text-steam transition-colors hover:text-fizz disabled:opacity-40";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className={`flex items-center overflow-hidden rounded-fizz border bg-ink-soft text-cream ${open ? "border-fizz ring-2 ring-fizz/40" : "border-ink-line"} ${disabled ? "opacity-60" : ""}`}
      >
        {stepper && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrease"
            disabled={disabled || (Number(current) || 0) <= min}
            onPointerDown={(e) => open && e.preventDefault()}
            onClick={() => bump(-1)}
            className={`${btnCls} border-r border-ink-line`}
          >
            −
          </button>
        )}
        {prefix != null && <span className="pl-4 font-display text-steam">{prefix}</span>}
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode={keypad ? "none" : decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          value={current}
          onChange={(e) => {
            set(sanitize(e.target.value));
            setFresh(false);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setFresh(true);
            // Touch devices only (phones, tablets); desktop types on the real keyboard.
            if (!keypad || !matchMedia("(pointer: coarse)").matches) return;
            setOpen(true);
            // Keypad renders under the field; keep it in view inside sheets.
            const el = e.currentTarget;
            requestAnimationFrame(() =>
              el.closest("[data-numinput]")?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
            );
          }}
          onBlur={() => {
            setOpen(false);
            if (current === "" || current === "-") return;
            set(tidy(Number(current) || 0));
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) {
              e.stopPropagation(); // close keypad, not the surrounding modal
              ref.current?.blur();
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              ref.current?.blur();
            }
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            bump(e.key === "ArrowUp" ? 1 : -1);
          }}
          className={`min-w-0 flex-1 bg-transparent py-3 font-display tabular-nums caret-fizz outline-none placeholder:text-steam ${prefix != null ? "pl-2" : "pl-4"} ${suffix != null ? "pr-2" : "pr-4"}`}
        />
        {suffix != null && <span className="pr-4 text-sm text-steam">{suffix}</span>}
        {stepper && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increase"
            disabled={disabled || (max !== undefined && (Number(current) || 0) >= max)}
            onPointerDown={(e) => open && e.preventDefault()}
            onClick={() => bump(1)}
            className={`${btnCls} border-l border-ink-line`}
          >
            +
          </button>
        )}
      </div>
      {open && (
        <div data-numinput>
          <Keypad onKey={press} decimal={decimals > 0} />
        </div>
      )}
    </div>
  );
}
