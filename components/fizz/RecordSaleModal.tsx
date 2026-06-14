"use client";

import { useState } from "react";
import Modal from "./Modal";
import DailySaleForm from "./DailySaleForm";

export default function RecordSaleModal({ currency }: { currency: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
      >
        Record a day
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <DailySaleForm currency={currency} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
