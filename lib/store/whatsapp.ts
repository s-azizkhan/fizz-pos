import { formatMoney } from "@/lib/store/format";

// Client-safe helpers for sending a customer their order on WhatsApp.

// wa.me wants the full international number, digits only. A number keyed
// without a country code borrows the café's own, taken from its WhatsApp
// ordering number (Menu → Public menu settings).
// ponytail: assumes 10-digit national numbers (India and friends). Store
// numbers with + if the café serves other countries.
export function waNumber(phone: string, cafeWhatsapp: string | null): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  // Local trunk prefix ("09876…") isn't part of the international number.
  const national = digits.replace(/^0+/, "");
  if (national.length > 10 || !cafeWhatsapp) return national;
  return cafeWhatsapp.replace(/\D/g, "").slice(0, -10) + national;
}

export function waLink(phone: string, cafeWhatsapp: string | null, text: string): string {
  return `https://wa.me/${waNumber(phone, cafeWhatsapp)}?text=${encodeURIComponent(text)}`;
}

// The summary a café sends a customer. WhatsApp renders *bold*.
export function orderShareText(o: {
  storeName: string;
  orderNumber: string;
  customerName: string | null;
  lines: { name: string; variantName?: string | null; quantity: number; lineTotal: string | number }[];
  total: string | number;
  paid: boolean;
  currency: string;
}): string {
  const m = (n: string | number) => formatMoney(n, o.currency).replace(/\.00$/, "");
  return [
    `${o.customerName ? `Hi ${o.customerName.split(" ")[0]}! ` : ""}Your order *#${o.orderNumber}* at *${o.storeName}*:`,
    "",
    ...o.lines.map(
      (l) => `• ${l.quantity}× ${l.name}${l.variantName ? ` (${l.variantName})` : ""} — ${m(l.lineTotal)}`,
    ),
    "",
    `*Total: ${m(o.total)}* (${o.paid ? "paid" : "on your tab"})`,
    "Thank you — see you soon!",
  ].join("\n");
}
