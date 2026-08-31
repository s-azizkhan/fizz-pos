// Pure document-number formatter. No server-only deps — imported by the
// client settings preview AND the server number generator, so behaviour stays
// identical in both.
//
// Tokens (case-insensitive):
//   {PREFIX}          configured prefix
//   {SEQ} / {SEQ:n}   running sequence, optionally zero-padded to n digits
//   {AUTO} / {AUTO:n} alias for SEQ
//   {DD} {MM} {YY} {YYYY}
//   {DDMMYYYY} {DDMMYY} {YYYYMMDD}
export type DocNumberParts = { prefix?: string; seq: number; date: Date };

export function formatDocNumber(template: string, parts: DocNumberParts): string {
  const { prefix = "", seq, date } = parts;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const pad = (n: string | undefined) =>
    String(seq).padStart(n ? Number(n) : 1, "0");

  return template
    .replace(/\{SEQ(?::(\d+))?\}/gi, (_, n) => pad(n))
    .replace(/\{AUTO(?::(\d+))?\}/gi, (_, n) => pad(n))
    .replace(/\{PREFIX\}/gi, prefix)
    .replace(/\{DDMMYYYY\}/gi, `${dd}${mm}${yyyy}`)
    .replace(/\{DDMMYY\}/gi, `${dd}${mm}${yy}`)
    .replace(/\{YYYYMMDD\}/gi, `${yyyy}${mm}${dd}`)
    .replace(/\{YYYY\}/gi, yyyy)
    .replace(/\{YY\}/gi, yy)
    .replace(/\{MM\}/gi, mm)
    .replace(/\{DD\}/gi, dd);
}

// Format a money amount (string or number) in the store currency. Uses a fixed
// locale ("en-US") so server-rendered and client-rendered output match exactly
// (avoids React hydration mismatches); the currency code still drives the
// symbol. Falls back to a plain 2-decimal string if the currency is unknown.
export function formatMoney(amount: string | number, currency: string): string {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

// Build a UPI deep link (NPCI spec) that a customer's UPI app can scan to pay
// a pre-filled amount. `pa` (VPA) is the only truly required field; `am` locks
// the amount so the cashier never re-keys it. Values are URI-encoded because
// payee names contain spaces and `&`.
export type UpiLinkParts = {
  vpa: string;
  name?: string | null;
  amount?: number;
  note?: string | null;
  currency?: string;
};

export function upiPayLink({
  vpa,
  name,
  amount,
  note,
  currency = "INR",
}: UpiLinkParts): string {
  // Hand-built, not URLSearchParams: that encodes spaces as "+", which several
  // UPI apps render literally in the payee name. %20 is the safe form.
  const q: string[] = [`pa=${encodeURIComponent(vpa)}`];
  if (name) q.push(`pn=${encodeURIComponent(name)}`);
  if (amount && amount > 0) q.push(`am=${amount.toFixed(2)}`);
  q.push(`cu=${encodeURIComponent(currency)}`);
  if (note) q.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${q.join("&")}`;
}
