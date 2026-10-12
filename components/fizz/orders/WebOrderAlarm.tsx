"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import RingAlarm from "./RingAlarm";

// Rings when a guest places an order from the public menu, on every dashboard
// screen, until someone taps Stop. Accepting the order in the POS clears it
// for everyone.
//
// ponytail: a 15s poll (two columns, ≤20 rows) — fine on a weak link, but it
// keeps a serverless DB awake while a dashboard is open. Swap for push
// (SSE / web push) if that bill matters.
const POLL_MS = 15_000;

export default function WebOrderAlarm() {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.orders.webPending.queryOptions(),
    refetchInterval: POLL_MS,
    // A counter tablet often has the dashboard in a background tab.
    refetchIntervalInBackground: true,
  });
  return (
    <RingAlarm
      items={data ?? []}
      storageKey="fizz-web-acked"
      label="New web order"
      href="/dashboard/orders"
    />
  );
}
