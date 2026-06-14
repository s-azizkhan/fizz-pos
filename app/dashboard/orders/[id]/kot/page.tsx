import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getOrder } from "@/lib/store/orders";
import KotTicket from "@/components/fizz/orders/KotTicket";

export const metadata: Metadata = { title: "KOT — Fizz" };

const TYPE_LABEL: Record<string, string> = {
  dine_in: "DINE IN",
  takeaway: "TAKEAWAY",
  delivery: "DELIVERY",
};

// Kitchen Order Ticket: a clean, high-contrast, print-ready slip listing only
// what the kitchen needs — items, quantities, table/type, and a timestamp.
// Money is intentionally omitted (that's the bill, not the KOT).
export default async function KotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentUser();
  const { id } = await params;
  const [store, order] = await Promise.all([getStore(), getOrder(id)]);
  if (!order) notFound();

  return (
    <KotTicket
      storeName={store.name}
      orderNumber={order.number}
      type={TYPE_LABEL[order.type] ?? order.type}
      reference={order.reference}
      status={order.status}
      createdAt={order.createdAt.toISOString()}
      items={order.items.map((it) => ({
        name: it.name,
        variantName: it.variantName,
        quantity: it.quantity,
      }))}
    />
  );
}
