import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, normalisePhone, orderItems, orders } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Map what the POS keyed into one row of the customer book, creating or
// updating it. Phone is the identity; a picked customer (id) gets edits.
// Returns the customer id, or null when nothing was entered.
export async function resolveCustomer(
  tx: Tx,
  input: { customerId?: string | null; customerName: string | null; customerPhone: string | null },
): Promise<string | null> {
  const name = input.customerName;
  const phone = normalisePhone(input.customerPhone);
  if (!input.customerId && !name && !phone) return null;

  const byPhone = async (p: string) =>
    (await tx.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.storeId, STORE_ID), eq(customers.phone, p))).limit(1))[0];

  if (input.customerId) {
    const [c] = await tx.select().from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.storeId, STORE_ID))).limit(1);
    // A number that already belongs to someone else wins — link to them.
    const owner = c && phone && phone !== c.phone ? await byPhone(phone) : undefined;
    const target = owner?.id ?? c?.id;
    if (target) {
      await tx.update(customers)
        .set({
          ...(name && { name }),
          ...(phone && !owner && { phone }),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, target));
      return target;
    }
    // Stale id (customer deleted) — fall through and resolve by name/phone.
  }

  if (phone) {
    const [c] = await tx.insert(customers)
      .values({ storeId: STORE_ID, name, phone })
      .onConflictDoUpdate({
        target: [customers.storeId, customers.phone],
        set: { name: sql`coalesce(excluded.name, ${customers.name})`, updatedAt: new Date() },
      })
      .returning({ id: customers.id });
    return c.id;
  }

  if (!name) return null;
  // ponytail: name-only match is exact (case-insensitive) — two "Sam"s with no
  // number share a row. Ask for a phone when that matters.
  const [same] = await tx.select({ id: customers.id }).from(customers)
    .where(and(
      eq(customers.storeId, STORE_ID),
      isNull(customers.phone),
      sql`lower(${customers.name}) = lower(${name})`,
    )).limit(1);
  if (same) return same.id;
  const [c] = await tx.insert(customers)
    .values({ storeId: STORE_ID, name })
    .returning({ id: customers.id });
  return c.id;
}

// The whole customer book, for on-device search at the POS.
// ponytail: newest 5000 only (~400KB worst case, cached on the device). Page it
// or fall back to a server search if a café ever outgrows that.
export async function customerBook() {
  return db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(eq(customers.storeId, STORE_ID))
    .orderBy(desc(customers.updatedAt))
    .limit(5000);
}

export async function customersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(and(eq(customers.storeId, STORE_ID), inArray(customers.id, ids)));
}

export async function getCustomer(id: string) {
  const [c] = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.storeId, STORE_ID)))
    .limit(1);
  return c ?? null;
}

// Customers page: everyone in the book with their lifetime numbers. Void
// orders don't count; spend is paid orders only.
// Search happens on the device (lib/store/customer-match.ts), so this ships
// the lot once. ponytail: capped at 2000 rows, newest activity first; add
// paging + server search when a café outgrows that.
export async function listCustomers() {
  const live = sql`${orders.status} <> 'void'`;
  return db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      orderCount: sql<number>`count(${orders.id}) filter (where ${live})`.mapWith(Number),
      spent: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'paid'), 0)`,
      lastOrderAt: sql<Date | null>`max(${orders.createdAt}) filter (where ${live})`.mapWith((v) => (v ? new Date(v) : null)),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(eq(customers.storeId, STORE_ID))
    .groupBy(customers.id)
    .orderBy(sql`max(${orders.createdAt}) desc nulls last`, desc(customers.createdAt))
    .limit(2000);
}

// One customer's order history, newest first, with lines for a quick read.
export async function customerOrders(customerId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), eq(orders.customerId, customerId)))
    .orderBy(desc(orders.createdAt));
  if (rows.length === 0) return [];
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((r) => r.id)));
  return rows.map((o) => ({ ...o, items: items.filter((it) => it.orderId === o.id) }));
}
