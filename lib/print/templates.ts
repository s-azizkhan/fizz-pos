import { escpos, type Align } from "./escpos";
import { currencySymbol, formatMoney } from "@/lib/store/format";

export type PaperWidth = 58 | 80;

// Characters per line in Font A at default spacing: 32 on 58mm, 48 on 80mm.
// Receipts use this dense layout.
const COLS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

// KOT only: extra dots after each character (ESC SP). Font A is 12 dots wide,
// so this eats into the line: 58mm (384 dots) fits 29 chars at 1, 80mm (576)
// fits 44. ponytail: calibration knobs — LETTER_GAP 0 = dense layout.
const LETTER_GAP = 1;
const KOT_COLS: Record<PaperWidth, number> = {
  58: Math.floor(384 / (12 + LETTER_GAP)),
  80: Math.floor(576 / (12 + LETTER_GAP)),
};
// KOT line height in dots (printer default ~30).
const LINE_GAP = 50;

// A ticket is an ordered list of blocks the owner can reorder, hide, or add
// to (Printers → Ticket design). Built-in blocks (name, items, …) render order
// data; "text", "rule" and "space" are free-form and can repeat.
export type Block = {
  id: string;
  type: string;
  on: boolean;
  text?: string;
  align?: Align;
  bold?: boolean;
  big?: boolean;
};

export type PrintCfg = { paper: PaperWidth; receipt?: Block[]; kot?: Block[] };

const b = (type: string, extra: Partial<Block> = {}): Block => ({ id: type, type, on: true, ...extra });
const ruleB = (n: number) => b("rule", { id: `rule${n}` });

export const RECEIPT_LAYOUT: Block[] = [
  b("name"),
  b("address"),
  b("contact"),
  ruleB(1),
  b("order"),
  ruleB(2),
  b("items"),
  ruleB(3),
  b("totals"),
  b("total"),
  b("payment"),
  ruleB(4),
  b("text", { id: "thanks", text: "Thank you!", align: "center" }),
  b("tagline"),
];

export const KOT_LAYOUT: Block[] = [
  b("title"),
  b("reference"),
  b("addon"),
  b("meta"),
  ruleB(1),
  b("items"),
  ruleB(2),
];

type Doc = ReturnType<typeof escpos>;

// Free-form blocks, shared by both tickets.
function custom(p: Doc, blk: Block, cols: number) {
  if (blk.type === "rule") p.align("left").line("-".repeat(cols));
  else if (blk.type === "space") p.feed(1);
  else if (blk.type === "text" && blk.text?.trim()) {
    p.align(blk.align ?? "center").bold(!!blk.bold).size(blk.big ? 2 : 1);
    const room = blk.big ? Math.floor(cols / 2) : cols;
    for (const l of blk.text.split("\n")) wrap(l, room, 0).forEach((s) => p.line(s));
    p.size(1).bold(false);
  }
}

export type ReceiptData = {
  store: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    phone?: string | null;
    website?: string | null;
    instagram?: string | null;
    delivery?: boolean;
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

// Store-currency money the printer can draw: ASCII symbols and ₹ (a custom
// glyph) as-is, anything else as the code: "€4.50" → "EUR 4.50".
export function printMoney(amount: string | number, currency: string): string {
  const s = formatMoney(amount, currency);
  const sym = currencySymbol(currency);
  return sym !== "₹" && /[^\x20-\x7e]/.test(sym) ? s.replace(sym, `${currency} `) : s;
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

export function receiptDoc(d: ReceiptData, { paper, receipt: layout = RECEIPT_LAYOUT }: PrintCfg): Doc {
  const cols = COLS[paper];
  const m = (v: string | number) => printMoney(v, d.currency);
  const p = escpos();

  for (const blk of layout) {
    if (!blk.on) continue;
    switch (blk.type) {
      case "name":
        p.align("center").bold(true).size(2).line(d.store.name).size(1).bold(false);
        break;
      case "address":
        p.align("center");
        for (const l of [d.store.addressLine1, d.store.addressLine2]) if (l) p.line(l);
        break;
      case "contact": {
        p.align("center");
        const site = d.store.website?.replace(/^https?:\/\/(www\.)?|\/$/g, "");
        for (const l of [d.store.phone, site]) if (l) p.line(l);
        break;
      }
      case "order":
        p.align("left").line(`Order ${d.orderNumber}`).line(shortTime(d.createdAt));
        p.line(typeLabel(d.type) + (d.reference ? ` - ${d.reference}` : ""));
        break;
      case "items":
        p.align("left");
        for (const l of d.lines) {
          const name = `${l.quantity} x ${l.name}${l.variantName ? ` (${l.variantName})` : ""}`;
          row(name, m(l.lineTotal), cols).forEach((s) => p.line(s));
        }
        break;
      case "totals": {
        // Subtotal only earns its line when something moved the total.
        const totals: [string, string][] =
          Number(d.subtotal) === Number(d.total) ? [] : [["Subtotal", m(d.subtotal)]];
        if (Number(d.discount) > 0) totals.push(["Discount", `-${m(d.discount)}`]);
        if (Number(d.tax) > 0) totals.push([d.taxLabel, m(d.tax)]);
        if (Number(d.fees.service) > 0) totals.push(["Service", m(d.fees.service)]);
        if (Number(d.fees.packaging) > 0) totals.push(["Packaging", m(d.fees.packaging)]);
        if (Number(d.fees.delivery) > 0) totals.push(["Delivery", m(d.fees.delivery)]);
        p.align("left");
        for (const [k, v] of totals) row(k, v, cols).forEach((s) => p.line(s));
        break;
      }
      case "total":
        p.align("left").bold(true).size(1, 2);
        row("TOTAL", m(d.total), cols).forEach((s) => p.line(s));
        p.size(1).bold(false);
        break;
      case "payment":
        p.align("left");
        if (d.paymentMethod) row("Paid by", d.paymentMethod.toUpperCase(), cols).forEach((s) => p.line(s));
        break;
      case "tagline": {
        const tagline = d.store.delivery
          ? "Home delivery available"
          : d.store.instagram
            ? `Follow us on Insta @${d.store.instagram.replace(/^@/, "")}`
            : "We look forward to serving you again";
        p.align("center");
        wrap(tagline, cols, 0).forEach((s) => p.line(s));
        break;
      }
      default:
        custom(p, blk, cols);
    }
  }
  return p.feed(3).cut();
}

export const receipt = (d: ReceiptData, cfg: PrintCfg) => receiptDoc(d, cfg).bytes();

// "11:09pm 9 oct 26" — short and 12h, for KOTs and receipts.
export function shortTime(d: string | Date): string {
  const t = new Date(d);
  const h = t.getHours();
  const mm = String(t.getMinutes()).padStart(2, "0");
  const mon = t.toLocaleString("en-GB", { month: "short" }).toLowerCase();
  return `${h % 12 || 12}:${mm}${h < 12 ? "am" : "pm"} ${t.getDate()} ${mon} ${String(t.getFullYear()).slice(-2)}`;
}

// "FZ-20261009-07" -> "07": the kitchen only calls the running number.
// ponytail: assumes {SEQ} is the last separated chunk of the number format
// (the default); a format ending in a date would print the date instead.
export function kotSeq(orderNumber: string): string {
  return orderNumber.split(/[-/ ]/).pop() || orderNumber;
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
export function kotDoc(d: KotData, { paper, kot: layout = KOT_LAYOUT }: PrintCfg): Doc {
  const cols = KOT_COLS[paper];
  const p = escpos().spacing(LINE_GAP).letterSpacing(LETTER_GAP).dark(true);

  for (const blk of layout) {
    if (!blk.on) continue;
    switch (blk.type) {
      case "title":
        p.align("center").bold(true).size(2).line(`KOT:${typeLabel(d.type)}`).size(1).bold(false);
        break;
      case "reference":
        if (d.reference) p.align("center").bold(true).size(1, 2).line(d.reference).size(1).bold(false);
        break;
      case "addon":
        if (d.addOn) p.align("center").bold(true).line("+ ADD-ON").bold(false);
        break;
      case "meta":
        p.align("center").bold(true).line(`#${kotSeq(d.orderNumber)}  ${shortTime(d.createdAt)}`).bold(false);
        break;
      case "items":
        p.align("left");
        for (const i of d.items) {
          const qty = `${i.quantity} x `;
          p.bold(true).size(1, 2);
          wrap(qty + i.name, cols, qty.length).forEach((s) => p.line(s));
          p.bold(false).size(1);
          if (i.variantName) p.line(" ".repeat(qty.length) + i.variantName);
        }
        break;
      default:
        custom(p, blk, cols);
    }
  }
  // ponytail: 2 lines (~10mm) clears most tear bars; raise if the last item
  // tears off.
  return p.feed(2).cut();
}

export const kot = (d: KotData, cfg: PrintCfg) => kotDoc(d, cfg).bytes();

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
