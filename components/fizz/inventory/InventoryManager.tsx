"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/fizz/Modal";
import InventoryItemForm from "./InventoryItemForm";
import StockMovementForm from "./StockMovementForm";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { INVENTORY_UNIT_LABELS } from "@/lib/db/schema";
import { formatMoney } from "@/lib/store/format";
import type { InventoryItemRow } from "@/lib/store/inventory";

const btnPrimary =
  "rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";
const btnGhost =
  "rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz";

type ModalState =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "edit"; item: InventoryItemRow }
  | { kind: "move"; item: InventoryItemRow };

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          await deleteInventoryItem({ ok: false }, fd);
        });
      }}
      className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export default function InventoryManager({
  rows,
  currency,
  canEdit,
}: {
  rows: InventoryItemRow[];
  currency: string;
  canEdit: boolean;
}) {
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const close = () => setModal({ kind: "none" });

  const cls = "px-4 py-3 text-left align-middle";

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setModal({ kind: "new" })} className={btnPrimary}>
            + Add item
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-10 text-center text-steam">
          No stock items yet.{canEdit ? " Add your first one above." : ""}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-fizz border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-xs uppercase tracking-[0.14em] text-steam">
                <th className={cls}>Item</th>
                <th className={cls}>Category</th>
                <th className={`${cls} text-right`}>On hand</th>
                <th className={`${cls} text-right`}>Reorder at</th>
                <th className={`${cls} text-right`}>Cost / unit</th>
                <th className={`${cls} text-right`}>Stock value</th>
                <th className={cls}>Supplier</th>
                {canEdit && <th className={`${cls} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-ink-line/60 last:border-0">
                  <td className={cls}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cream">{r.name}</span>
                      {r.lowStock && (
                        <span className="rounded-full border border-[#E2655A]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#E2655A]">
                          Low
                        </span>
                      )}
                    </div>
                    {r.sku && <span className="text-xs text-steam">{r.sku}</span>}
                  </td>
                  <td className={cls}>
                    <span className="rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-cream">{r.category}</span>
                  </td>
                  <td className={`${cls} text-right ${r.lowStock ? "text-[#E2655A]" : "text-cream"}`}>
                    {Number(r.quantity)} <span className="text-xs text-steam">{INVENTORY_UNIT_LABELS[r.unit].replace(/ .*/, "")}</span>
                  </td>
                  <td className={`${cls} text-right text-steam`}>{Number(r.reorderLevel)}</td>
                  <td className={`${cls} text-right text-cream`}>{formatMoney(r.costPerUnit, currency)}</td>
                  <td className={`${cls} text-right font-display font-semibold text-fizz`}>{formatMoney(r.stockValue, currency)}</td>
                  <td className={`${cls} text-steam`}>{r.supplier ?? "—"}</td>
                  {canEdit && (
                    <td className={`${cls} text-right`}>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setModal({ kind: "move", item: r })} className={btnGhost}>Adjust</button>
                        <button type="button" onClick={() => setModal({ kind: "edit", item: r })} className={btnGhost}>Edit</button>
                        <DeleteButton id={r.id} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.kind === "new"} onClose={close}>
        <InventoryItemForm currency={currency} onSuccess={close} />
      </Modal>
      <Modal open={modal.kind === "edit"} onClose={close}>
        {modal.kind === "edit" && (
          <InventoryItemForm item={modal.item} currency={currency} onSuccess={close} />
        )}
      </Modal>
      <Modal open={modal.kind === "move"} onClose={close}>
        {modal.kind === "move" && (
          <StockMovementForm item={modal.item} onSuccess={close} />
        )}
      </Modal>
    </div>
  );
}
