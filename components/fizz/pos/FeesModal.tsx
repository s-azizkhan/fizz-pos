"use client";

import { useState } from "react";
import Modal from "@/components/fizz/Modal";
import type { OrderFees, OrderType } from "./types";

// The fees a till can add on top of an order. Delivery is only offered on
// delivery orders. Any combination can ride on a single order.
export const FEE_FIELDS: {
  key: keyof OrderFees;
  label: string;
  hint: string;
}[] = [
  { key: "service", label: "Service fee", hint: "Table service / gratuity" },
  { key: "packaging", label: "Packaging fee", hint: "Boxes, bags, cutlery" },
  { key: "delivery", label: "Delivery fee", hint: "Rider charge" },
];

export function feesTotal(fees: OrderFees) {
  return (
    Math.round((fees.service + fees.packaging + fees.delivery) * 100) / 100
  );
}

// Compact editor for the three flat fees. Keeps its own string state so a
// half-typed "1." doesn't get coerced away mid-keystroke.
export default function FeesModal(props: {
  open: boolean;
  fees: OrderFees;
  orderType: OrderType;
  money: (n: number) => string;
  onSave: (fees: OrderFees) => void;
  onClose: () => void;
}) {
  // Mount the form only while open so it always starts from the live fees —
  // no effect syncing props into state.
  return (
    <Modal open={props.open} onClose={props.onClose} maxWidth="max-w-md">
      <FeesForm {...props} />
    </Modal>
  );
}

function FeesForm({
  fees,
  orderType,
  money,
  onSave,
  onClose,
}: {
  fees: OrderFees;
  orderType: OrderType;
  money: (n: number) => string;
  onSave: (fees: OrderFees) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<keyof OrderFees, string>>({
    service: fees.service ? String(fees.service) : "",
    packaging: fees.packaging ? String(fees.packaging) : "",
    delivery: fees.delivery ? String(fees.delivery) : "",
  });

  const fields = FEE_FIELDS.filter(
    (f) => f.key !== "delivery" || orderType === "delivery",
  );
  const parsed: OrderFees = {
    service: Math.max(0, Number(draft.service) || 0),
    packaging: Math.max(0, Number(draft.packaging) || 0),
    delivery:
      orderType === "delivery" ? Math.max(0, Number(draft.delivery) || 0) : 0,
  };

  function save() {
    onSave(parsed);
    onClose();
  }

  return (
    <div className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Add fees
      </p>
      <p className="mt-1 text-sm text-steam">
        Charged on top of tax. Leave a field empty to skip it.
      </p>

      <div className="mt-5 space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="flex items-baseline justify-between">
              <span className="text-sm text-cream">{f.label}</span>
              <span className="text-xs text-steam">{f.hint}</span>
            </span>
            <input
              autoFocus={f.key === "service"}
              inputMode="decimal"
              value={draft[f.key]}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [f.key]: e.target.value.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholder="0.00"
              className="mt-1 w-full rounded-fizz border border-ink-line bg-ink px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => {
            onSave({ service: 0, packaging: 0, delivery: 0 });
            onClose();
          }}
          className="flex-1 rounded-fizz border border-ink-line bg-ink px-4 py-3 text-cream transition-colors hover:border-[#E2655A] hover:text-[#E2655A]"
        >
          Clear
        </button>
        <button
          onClick={save}
          className="flex-[2] rounded-fizz bg-fizz px-4 py-3 font-display font-bold text-ink transition-transform hover:scale-[1.02]"
        >
          Add {money(feesTotal(parsed))}
        </button>
      </div>
    </div>
  );
}
