import type { Metadata } from "next";
import PrintersClient from "@/components/fizz/printers/PrintersClient";

export const metadata: Metadata = { title: "Printers — Fizz" };

// Every role: printer pairing is per device, and staff run the till.
export default function PrintersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        This device
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Printers
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Pair a Bluetooth receipt printer — tickets print straight from the till,
        no dialog.
      </p>

      <div className="mt-10">
        <PrintersClient />
      </div>
    </div>
  );
}
