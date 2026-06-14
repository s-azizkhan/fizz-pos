import { useCallback, useMemo, useState } from "react";
import type { CartLine, PosItem, PosVariant } from "./types";

// Build the stable stacking key for an item (+ optional variant).
function lineKey(itemId: string, variantId: string | null): string {
  return variantId ? `${itemId}:${variantId}` : itemId;
}

// Cart state + mutations. Repeat adds stack quantity on the matching line.
// `initial` seeds the cart (e.g. a revisited tab loaded into the till).
export function useCart(initial: CartLine[] = []) {
  const [lines, setLines] = useState<CartLine[]>(initial);

  // Replace the whole cart — used when loading an existing order for editing.
  const load = useCallback((next: CartLine[]) => setLines(next), []);

  const add = useCallback((item: PosItem, variant: PosVariant | null) => {
    const key = lineKey(item.id, variant?.id ?? null);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          key,
          menuItemId: item.id,
          variantId: variant?.id ?? null,
          name: item.name,
          variantName: variant?.name ?? null,
          unitPrice: variant ? variant.price : item.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQty = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );
  }, []);

  const inc = useCallback(
    (key: string) =>
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)),
      ),
    [],
  );

  const dec = useCallback(
    (key: string) =>
      setLines((prev) =>
        prev
          .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
          .filter((l) => l.quantity > 0),
      ),
    [],
  );

  const remove = useCallback(
    (key: string) => setLines((prev) => prev.filter((l) => l.key !== key)),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () =>
      Math.round(
        lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100,
      ) / 100,
    [lines],
  );

  const count = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines],
  );

  return { lines, add, setQty, inc, dec, remove, clear, load, subtotal, count };
}
