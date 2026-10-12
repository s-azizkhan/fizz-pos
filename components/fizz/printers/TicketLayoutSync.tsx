"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { KOT_LAYOUT, RECEIPT_LAYOUT, type Block } from "@/lib/print/templates";
import { usePrinter } from "@/lib/store/printer";

type Layouts = { receipt?: Block[]; kot?: Block[] };

// Keeps this POS's printer store on the shop-wide ticket design. Seeded from
// the server render, then refetched when the tab regains focus. No polling:
// an interval would keep a serverless DB (Neon) from ever suspending.
export default function TicketLayoutSync({ initial }: { initial: Layouts }) {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.store.ticketLayouts.queryOptions(),
    initialData: initial,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    usePrinter.setState({ receipt: data.receipt ?? RECEIPT_LAYOUT, kot: data.kot ?? KOT_LAYOUT });
  }, [data]);
  return null;
}
