// Client-safe customer search, shared by the POS lookup and the Customers page.
// Runs on the device — no round trip per keystroke, so it stays instant on a
// weak connection.
export type CustomerLite = { id: string; name: string | null; phone: string | null };

export function matchCustomer(c: CustomerLite, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const digits = term.replace(/\D/g, "");
  return (
    (c.name?.toLowerCase().includes(term) ?? false) ||
    (digits.length >= 3 && (c.phone?.includes(digits) ?? false))
  );
}
