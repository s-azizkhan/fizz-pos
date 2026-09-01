import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import KotBoard from "@/components/fizz/orders/KotBoard";

export const metadata: Metadata = { title: "KOT board — Fizz" };

// Every lane is server-rendered: the kitchen stares at this screen all shift,
// so the first paint should already be the real board, not a spinner or a set
// of zeroes. The client takes over polling from there.
export default async function KotPage() {
  await getCurrentUser();
  const api = await trpc();
  const [newLane, accepted, ready, initialCounts] = await Promise.all([
    api.orders.kot("new"),
    api.orders.kot("accepted"),
    api.orders.kot("ready"),
    api.orders.kotCounts(),
  ]);

  return (
    <KotBoard
      initial={{ new: newLane, accepted, ready }}
      initialCounts={initialCounts}
    />
  );
}
