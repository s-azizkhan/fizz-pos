// Pure order money math. No DB, no server-only imports — so it is importable
// from a plain script (scripts/check-checkout.mts) as well as the tRPC router.
// Money is numeric-as-string in the DB; this works in numbers and the caller
// formats with toFixed(2).
import type { CheckoutInput, OrderFees } from "@/lib/db/schema";

export const r2 = (n: number) => Math.round(n * 100) / 100;

// Recompute totals server-side from the validated lines — never trust client
// math. Applies the store's tax: when inclusive, prices already contain tax so
// we back it out; otherwise tax is added on top of the discounted subtotal.
// Flat fees ride on top of the taxed total and are never taxed themselves;
// delivery only applies to delivery orders, whatever the client sent.
export function computeTotals(
  items: CheckoutInput["items"],
  discount: number,
  tax: { rate: number; inclusive: boolean },
  fees: OrderFees,
  type: CheckoutInput["type"],
) {
  const lines = items.map((l) => ({
    ...l,
    lineTotal: r2(l.unitPrice * l.quantity),
  }));
  const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const safeDiscount = Math.min(discount, subtotal);
  const net = r2(subtotal - safeDiscount); // taxable base
  const rate = tax.rate / 100;

  let taxAmount = 0;
  let total = net;
  if (rate > 0) {
    if (tax.inclusive) {
      // Prices include tax — extract the tax portion; total is unchanged.
      taxAmount = r2(net - net / (1 + rate));
      total = net;
    } else {
      taxAmount = r2(net * rate);
      total = r2(net + taxAmount);
    }
  }

  const service = r2(fees.service);
  const packaging = r2(fees.packaging);
  const delivery = type === "delivery" ? r2(fees.delivery) : 0;
  total = r2(total + service + packaging + delivery);

  return {
    lines,
    subtotal,
    safeDiscount,
    taxAmount,
    taxRate: tax.rate,
    service,
    packaging,
    delivery,
    total,
  };
}

