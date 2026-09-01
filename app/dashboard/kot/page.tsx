import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import KotBoard from "@/components/fizz/orders/KotBoard";

export const metadata: Metadata = { title: "KOT board — Fizz" };

// The queue lane is what the kitchen stares at all shift, so it is server
// rendered; the board then polls for itself.
export default async function KotPage() {
  await getCurrentUser();
  const api = await trpc();
  const [initialOrders, initialCounts] = await Promise.all([
    api.orders.kot("new"),
    api.orders.kotCounts(),
  ]);

  return (
    <KotBoard
      initialLane="new"
      initialOrders={initialOrders}
      initialCounts={initialCounts}
    />
  );
}
