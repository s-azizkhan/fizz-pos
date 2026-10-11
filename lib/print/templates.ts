import { escpos } from "./escpos";
import { currencySymbol, formatDateTime, formatMoney } from "@/lib/store/format";

export type PaperWidth = 58 | 80;

// Characters per line in Font A: 32 on 58mm, 48 on 80mm.
const COLS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

export type ReceiptData = {
  store: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    phone?: string | null;
  };
  currency: string;
  orderNumber: string;
  createdAt: string | Date;
  type: string;
  reference: string | null;
  lines: {
    name: string;
    variantName?: string | null;
    quantity: number;
    lineTotal: string | number;
  }[];
  subtotal: string;
  discount: string;
  tax: string;
  taxLabel: string;
  fees: { service: string; packaging: string; delivery: string };
  total: string;
  paymentMethod?: string | null;
  changeDue?: string | null;
};

export type KotData = {
  storeName: string;
  orderNumber: string;
  type: string;
  reference: string | null;
  createdAt: string | Date;
  addOn?: boolean; // extra lines for a tab the kitchen already has
  items: { name: string; variantName?: string | null; quantity: number }[];
};

// Store-currency money with an ASCII symbol: "₹120.00" → "INR 120.00".
export function printMoney(amount: string | number, currency: string): string {
  const s = formatMoney(amount, currency);
  const sym = currencySymbol(currency);
  return /[^\x20-\x7e]/.test(sym) ? s.replace(sym, `${currency} `) : s;
}

const typeLabel = (t: string) => t.replace(/_/g, " ").toUpperCase();

// Left text + right-aligned value on one line. A left side too long to fit
// wraps onto extra lines; the value sits on the first.
export function row(left: string, right: string, cols: number): string[] {
  const room = Math.max(8, cols - right.length - 1);
  const chunks: string[] = [];
  for (let i = 0; i < left.length; i += room) chunks.push(left.slice(i, i + room));
  if (chunks.length === 0) chunks.push("");
  return chunks.map((c, i) =>
    i === 0 ? c.padEnd(room) + " " + right : c,
  );
}

export function receipt(d: ReceiptData, paper: PaperWidth): Uint8Array<ArrayBuffer> {
  const cols = COLS[paper];
  const rule = "-".repeat(cols);
  const m = (v: string | number) => printMoney(v, d.currency);
  const p = escpos();

  p.align("center").bold(true).size(2).line(d.store.name).size(1).bold(false);
  for (const l of [d.store.addressLine1, d.store.addressLine2, d.store.phone]) {
    if (l) p.line(l);
  }

  p.align("left").line(rule);
  p.line(`Order ${d.orderNumber}`);
  p.line(formatDateTime(d.createdAt));
  p.line(typeLabel(d.type) + (d.reference ? ` - ${d.reference}` : ""));
  p.line(rule);

  for (const l of d.lines) {
    const name = `${l.quantity} x ${l.name}${l.variantName ? ` (${l.variantName})` : ""}`;
    row(name, m(l.lineTotal), cols).forEach((s) => p.line(s));
  }
  p.line(rule);

  const totals: [string, string][] = [["Subtotal", m(d.subtotal)]];
  if (Number(d.discount) > 0) totals.push(["Discount", `-${m(d.discount)}`]);
  if (Number(d.tax) > 0) totals.push([d.taxLabel, m(d.tax)]);
  if (Number(d.fees.service) > 0) totals.push(["Service", m(d.fees.service)]);
  if (Number(d.fees.packaging) > 0) totals.push(["Packaging", m(d.fees.packaging)]);
  if (Number(d.fees.delivery) > 0) totals.push(["Delivery", m(d.fees.delivery)]);
  for (const [k, v] of totals) row(k, v, cols).forEach((s) => p.line(s));

  p.bold(true).size(1, 2);
  row("TOTAL", m(d.total), cols).forEach((s) => p.line(s));
  p.size(1).bold(false);

  if (d.paymentMethod) row("Paid by", d.paymentMethod.toUpperCase(), cols).forEach((s) => p.line(s));
  if (d.changeDue && Number(d.changeDue) > 0) row("Change", m(d.changeDue), cols).forEach((s) => p.line(s));

  p.line(rule).align("center").line("Thank you!").feed(3).cut();
  return p.bytes();
}

// "11:09pm 9 oct 26" — short and 12h for the pass.
export function kotTime(d: string | Date): string {
  const t = new Date(d);
  const h = t.getHours();
  const mm = String(t.getMinutes()).padStart(2, "0");
  const mon = t.toLocaleString("en-GB", { month: "short" }).toLowerCase();
  return `${h % 12 || 12}:${mm}${h < 12 ? "am" : "pm"} ${t.getDate()} ${mon} ${String(t.getFullYear()).slice(-2)}`;
}

// Wrap text to `cols`, continuation lines indented by `indent` spaces.
function wrap(text: string, cols: number, indent: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= cols || !cur) cur = next;
    else {
      out.push(cur);
      cur = " ".repeat(indent) + w;
    }
  }
  out.push(cur);
  return out;
}

// Kitchen ticket: no prices, big type, quantities first, minimal paper.
export function kot(d: KotData, paper: PaperWidth): Uint8Array<ArrayBuffer> {
  const cols = COLS[paper];
  const rule = "-".repeat(cols);
  const p = escpos().spacing(40);

  p.align("center").bold(true).size(2).line(`KOT:${typeLabel(d.type)}`);
  if (d.reference) p.size(1, 2).line(d.reference);
  p.size(1);
  if (d.addOn) p.line("+ ADD-ON");
  p.line(`${d.orderNumber}  ${kotTime(d.createdAt)}`).bold(false);
  p.align("left").line(rule);

  for (const i of d.items) {
    const qty = `${i.quantity} x `;
    p.bold(true).size(1, 2);
    wrap(qty + i.name, cols, qty.length).forEach((s) => p.line(s));
    p.bold(false).size(1);
    if (i.variantName) p.line(" ".repeat(qty.length) + i.variantName);
  }
  // ponytail: 2 lines (~10mm) clears most tear bars; raise if the last item
  // tears off.
  p.line(rule).feed(2).cut();
  return p.bytes();
}

// The Fizz wordmark as 1-bit pixel art: FIZZ + the squared-off dot.
const LOGO = [
  "#####.#####.#####.#####.##",
  "#.......#.......#.....#.##",
  "#.......#......#.....#....",
  "####....#.....#.....#.....",
  "#.......#....#.....#......",
  "#.......#...#.....#.......",
  "#.....#####.#####.#####...",
];

// Test slip: logo + one line, as little paper as the tear bar allows.
export function testTicket(): Uint8Array<ArrayBuffer> {
  return escpos()
    .align("center")
    .image(LOGO, 6)
    .feed(1)
    .bold(true)
    .line("TEST PRINT")
    .bold(false)
    .feed(3)
    .cut()
    .bytes();
}
