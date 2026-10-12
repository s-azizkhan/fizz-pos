import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { receiptStore } from "@/lib/store/order-settings";
import TicketDesigner from "@/components/fizz/printers/TicketDesigner";

export const metadata: Metadata = { title: "Ticket design — Fizz" };

export default async function TicketDesignPage() {
  const user = await getCurrentUser();
  const [s, store] = await Promise.all([getStore(), receiptStore()]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <Link href="/dashboard/printers" className="text-sm text-steam hover:text-fizz">
        ← Printers
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Every POS
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Ticket design
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Drag blocks, hide what you don&apos;t need, add your own lines — the
        paper on the right is exactly what prints.
      </p>

      <div className="mt-10">
        <TicketDesigner
          store={store}
          currency={s.currency}
          initial={s.ticketLayouts ?? {}}
          canEdit={user.role !== "staff"}
        />
      </div>
    </div>
  );
}
