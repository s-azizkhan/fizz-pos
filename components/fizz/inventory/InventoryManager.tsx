"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/fizz/Modal";
import InventoryItemForm from "./InventoryItemForm";
import StockMovementForm from "./StockMovementForm";
import StockHistory from "./StockHistory";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { INVENTORY_UNIT_LABELS } from "@/lib/db/schema";
import { formatMoney } from "@/lib/store/format";
import { Chip, ChipBar, SearchInput } from "@/components/fizz/ui/controls";
import type { InventoryItemRow } from "@/lib/store/inventory";

const btnPrimary =
  "rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";
const btnGhost =
  "rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz";

type ModalState =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "edit"; item: InventoryItemRow }
  | { kind: "move"; item: InventoryItemRow }
  | { kind: "history"; item: InventoryItemRow };

const nameBtn =
  "text-left font-medium text-cream underline decoration-ink-line decoration-dotted underline-offset-4 transition-colors hover:text-fizz hover:decoration-fizz";

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

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "low" | "ok">("all");
  const [cat, setCat] = useState("all");

  const cls = "px-4 py-3 text-left align-middle";

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const lowCount = rows.filter((r) => r.lowStock).length;
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (status === "low" && !r.lowStock) return false;
    if (status === "ok" && r.lowStock) return false;
    if (cat !== "all" && r.category !== cat) return false;
    if (q && !`${r.name} ${r.sku ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

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
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ChipBar>
                <Chip active={status === "all"} onClick={() => setStatus("all")}>
                  All
                </Chip>
                <Chip
                  tone="danger"
                  active={status === "low"}
                  onClick={() => setStatus("low")}
                >
                  Low
                  {lowCount > 0 && (
                    <span className="rounded-full bg-[#E2655A]/15 px-1.5 text-xs">
                      {lowCount}
                    </span>
                  )}
                </Chip>
                <Chip active={status === "ok"} onClick={() => setStatus("ok")}>
                  In stock
                </Chip>
              </ChipBar>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search items…"
                className="w-full sm:w-56"
              />
            </div>
            {categories.length > 1 && (
              <ChipBar label="Category">
                <Chip active={cat === "all"} onClick={() => setCat("all")}>
                  All
                </Chip>
                {categories.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </Chip>
                ))}
              </ChipBar>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="rounded-fizz border border-dashed border-ink-line bg-ink-soft/40 p-10 text-center text-steam">
              No items match these filters.
            </div>
          ) : (
            <>
          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {shown.map((r) => (
              <li
                key={r.id}
                className="rounded-fizz border border-ink-line bg-ink-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setModal({ kind: "history", item: r })} className={nameBtn}>
                        {r.name}
                      </button>
                      {r.lowStock && (
                        <span className="rounded-full border border-[#E2655A]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#E2655A]">
                          Low
                        </span>
                      )}
                    </div>
                    {r.sku && <span className="text-xs text-steam">{r.sku}</span>}
                    <span className="w-fit rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-cream">
                      {r.category}
                    </span>
                  </div>
                  <span className="font-display text-lg font-semibold text-fizz">
                    {formatMoney(r.stockValue, currency)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-steam">On hand</dt>
                    <dd className={r.lowStock ? "text-[#E2655A]" : "text-cream"}>
                      {Number(r.quantity)}{" "}
                      <span className="text-xs text-steam">
                        {INVENTORY_UNIT_LABELS[r.unit].replace(/ .*/, "")}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-steam">Reorder at</dt>
                    <dd className="text-cream">{Number(r.reorderLevel)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-steam">Cost / unit</dt>
                    <dd className="text-cream">{formatMoney(r.costPerUnit, currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-steam">Supplier</dt>
                    <dd className="text-right text-cream">{r.supplier ?? "—"}</dd>
                  </div>
                </dl>

                {canEdit && (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-ink-line/60 pt-3">
                    <button type="button" onClick={() => setModal({ kind: "move", item: r })} className={btnGhost}>Adjust</button>
                    <button type="button" onClick={() => setModal({ kind: "edit", item: r })} className={btnGhost}>Edit</button>
                    <DeleteButton id={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* sm and up: table */}
          <div className="hidden overflow-x-auto rounded-fizz border border-ink-line bg-ink-soft sm:block">
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
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-ink-line/60 last:border-0">
                    <td className={cls}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setModal({ kind: "history", item: r })} className={nameBtn}>
                          {r.name}
                        </button>
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
            </>
          )}
        </>
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
      <Modal open={modal.kind === "history"} onClose={close}>
        {modal.kind === "history" && <StockHistory item={modal.item} />}
      </Modal>
    </div>
  );
}
