"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ascii, RUPEE, type Align, type PrintOp } from "@/lib/print/escpos";
import {
  KOT_LAYOUT,
  kotDoc,
  RECEIPT_LAYOUT,
  receiptDoc,
  type Block,
  type OrderPart,
  type ReceiptData,
} from "@/lib/print/templates";
import { usePrinter } from "@/lib/store/printer";
import { useTRPC } from "@/lib/trpc/client";
import { Chip, ChipBar } from "@/components/fizz/ui/controls";
import { EyeIcon, EyeOffIcon } from "@/components/fizz/dashboard/icons";

type Kind = "receipt" | "kot";

const LABELS: Record<string, string> = {
  name: "Store name",
  address: "Address",
  contact: "Phone & website",
  order: "Order no., time & type",
  items: "Items",
  totals: "Subtotal, tax & fees",
  total: "Total",
  payment: "Paid by",
  tagline: "Tagline (delivery / Insta)",
  title: "KOT + order type",
  reference: "Table / reference",
  addon: "Add-on flag",
  meta: "Order no. & time",
  text: "Text",
  rule: "Divider",
  space: "Blank line",
};
const CUSTOM = ["text", "rule", "space"];
const PART_LABELS: [OrderPart, string][] = [
  ["num", "Order no."],
  ["time", "Time"],
  ["date", "Date"],
  ["type", "Order type"],
  ["ref", "Table / ref"],
];

const noop = () => () => {};
const newId = () => Math.random().toString(36).slice(2);

export default function TicketDesigner({
  store,
  currency,
  initial,
  canEdit,
}: {
  store: ReceiptData["store"];
  currency: string;
  initial: { receipt?: Block[]; kot?: Block[] };
  canEdit: boolean;
}) {
  const { paper, setPaper } = usePrinter();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [kind, setKind] = useState<Kind>("receipt");
  const [drag, setDrag] = useState<number | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  // Local while editing; the server copy (and every till) follows debounced.
  const [layouts, setLayouts] = useState({
    receipt: initial.receipt ?? RECEIPT_LAYOUT,
    kot: initial.kot ?? KOT_LAYOUT,
  });
  const { receipt, kot } = layouts;

  const trpc = useTRPC();
  const qc = useQueryClient();
  const persist = useMutation(
    trpc.store.setTicketLayout.mutationOptions({
      onSuccess: (_r, v) => {
        qc.setQueryData(trpc.store.ticketLayouts.queryKey(), (old) => ({ ...old, [v.kind]: v.blocks }));
      },
    }),
  );
  const timers = useRef<Partial<Record<Kind, ReturnType<typeof setTimeout>>>>({});

  if (!hydrated) return null;

  const blocks = layouts[kind];
  const save = (next: Block[]) => {
    if (!canEdit) return;
    setLayouts((l) => ({ ...l, [kind]: next }));
    const k = kind;
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => persist.mutate({ kind: k, blocks: next }), 600);
  };
  const patch = (i: number, p: Partial<Block>) =>
    save(blocks.map((blk, j) => (j === i ? { ...blk, ...p } : blk)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    next.splice(to, 0, ...next.splice(from, 1));
    save(next);
  };
  const add = (type: string) =>
    save([
      ...blocks,
      {
        id: newId(),
        type,
        on: true,
        ...(type === "text" ? { text: "", align: "center" as Align } : {}),
      },
    ]);

  // Sample order through the real template — the preview is the print.
  const now = new Date();
  const doc =
    kind === "receipt"
      ? receiptDoc(
          {
            store,
            currency,
            orderNumber: "FZ-20261011-07",
            createdAt: now,
            type: "dine_in",
            reference: "Table 4",
            lines: [
              { name: "Flat white", variantName: "Oat", quantity: 2, lineTotal: "360" },
              { name: "Almond croissant", quantity: 1, lineTotal: "220" },
            ],
            subtotal: "580",
            discount: "0",
            tax: "29",
            taxLabel: "GST 5%",
            fees: { service: "0", packaging: "0", delivery: "0" },
            total: "609",
            paymentMethod: "upi",
          },
          { paper, receipt },
        )
      : kotDoc(
          {
            storeName: store.name,
            orderNumber: "FZ-20261011-07",
            type: "dine_in",
            reference: "Table 4",
            createdAt: now,
            addOn: true,
            items: [
              { name: "Flat white", variantName: "Oat", quantity: 2 },
              { name: "Almond croissant", quantity: 1 },
            ],
          },
          { paper, kot },
        );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0 space-y-6">
        {!canEdit && (
          <p className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-sm text-steam">
            View only — ask a manager to change the ticket design.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={kind === "receipt"} onClick={() => setKind("receipt")}>
            Receipt
          </Chip>
          <Chip active={kind === "kot"} onClick={() => setKind("kot")}>
            KOT
          </Chip>
          <span className="mx-2 h-5 w-px bg-ink-line" />
          {/* Paper width is per printer, so it stays on this device. */}
          {([58, 80] as const).map((w) => (
            <Chip key={w} active={paper === w} onClick={() => setPaper(w)}>
              {w}mm
            </Chip>
          ))}
          {canEdit && (
            <span className="ml-auto">
              {/* Every till prints this, so a stray tap asks twice. */}
              <Chip
                active={resetArmed}
                tone="danger"
                onClick={() => {
                  if (!resetArmed) {
                    setResetArmed(true);
                    setTimeout(() => setResetArmed(false), 3000);
                    return;
                  }
                  setResetArmed(false);
                  save(kind === "receipt" ? RECEIPT_LAYOUT : KOT_LAYOUT);
                }}
              >
                {resetArmed ? "Tap again to reset" : `Reset ${kind === "receipt" ? "receipt" : "KOT"}`}
              </Chip>
            </span>
          )}
        </div>

        <ul className={`space-y-2 ${canEdit ? "" : "pointer-events-none"}`}>
          {blocks.map((blk, i) => (
            <li
              key={blk.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (drag !== null && drag !== i) {
                  move(drag, i);
                  setDrag(i);
                }
              }}
              onDrop={(e) => e.preventDefault()}
              className={`rounded-fizz border bg-ink-soft p-3 transition-colors ${
                drag === i ? "border-fizz" : "border-ink-line"
              } ${blk.on ? "" : "opacity-50"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", blk.id); // Firefox needs data
                    const li = e.currentTarget.closest("li");
                    if (li) e.dataTransfer.setDragImage(li, 16, 16);
                    setDrag(i);
                  }}
                  onDragEnd={() => setDrag(null)}
                  title="Drag to reorder"
                  className="cursor-grab select-none px-1 text-steam active:cursor-grabbing"
                >
                  ⋮⋮
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">
                  {LABELS[blk.type] ?? blk.type}
                </span>
                <IconBtn label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  ↑
                </IconBtn>
                <IconBtn
                  label="Move down"
                  onClick={() => move(i, i + 1)}
                  disabled={i === blocks.length - 1}
                >
                  ↓
                </IconBtn>
                {CUSTOM.includes(blk.type) ? (
                  <Chip
                    active={false}
                    tone="danger"
                    onClick={() => save(blocks.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Chip>
                ) : (
                  <button
                    type="button"
                    onClick={() => patch(i, { on: !blk.on })}
                    aria-label={blk.on ? "Hide" : "Show"}
                    aria-pressed={blk.on}
                    title={blk.on ? "Hide" : "Show"}
                    className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${
                      blk.on
                        ? "border-fizz bg-fizz/10 text-fizz"
                        : "border-ink-line text-steam hover:border-fizz/50"
                    }`}
                  >
                    {blk.on ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {blk.type === "order" && blk.on && (
                <OrderOptions blk={blk} onChange={(p) => patch(i, p)} />
              )}

              {blk.type === "tagline" && blk.on && (
                <ChipBar label="Show" className="mt-3 pl-7">
                  <Chip
                    active={!blk.noDelivery}
                    onClick={() => patch(i, { noDelivery: !blk.noDelivery })}
                    title="Home delivery available"
                  >
                    Delivery
                  </Chip>
                  {!blk.noDelivery && (
                    <Chip
                      active={!!blk.both}
                      onClick={() => patch(i, { both: !blk.both })}
                      title="Print the Insta line under delivery too"
                    >
                      Delivery + Insta
                    </Chip>
                  )}
                </ChipBar>
              )}

              {blk.type === "text" && (
                <div className="mt-3 space-y-2 pl-7">
                  <textarea
                    value={blk.text ?? ""}
                    onChange={(e) => patch(i, { text: e.target.value })}
                    rows={2}
                    placeholder="Wi-Fi: fizzguest / latte123"
                    className="w-full rounded-fizz border border-ink-line bg-ink px-4 py-3 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["left", "center", "right"] as const).map((a) => (
                      <Chip
                        key={a}
                        active={(blk.align ?? "center") === a}
                        onClick={() => patch(i, { align: a })}
                      >
                        {a[0].toUpperCase() + a.slice(1)}
                      </Chip>
                    ))}
                    <Chip active={!!blk.bold} onClick={() => patch(i, { bold: !blk.bold })}>
                      Bold
                    </Chip>
                    <Chip active={!!blk.big} onClick={() => patch(i, { big: !blk.big })}>
                      Big
                    </Chip>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className={`flex flex-wrap items-center gap-2 ${canEdit ? "" : "hidden"}`}>
          <Chip active={false} onClick={() => add("text")}>+ Text</Chip>
          <Chip active={false} onClick={() => add("rule")}>+ Divider</Chip>
          <Chip active={false} onClick={() => add("space")}>+ Blank line</Chip>
          <span className="ml-auto text-xs text-steam">
            {persist.isPending ? "Saving…" : persist.isError ? "Not saved" : "Saved for every till"}
          </span>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Preview · {paper}mm
        </p>
        <Paper ops={doc.ops} paper={paper} />
      </div>
    </div>
  );
}

// Receipt "order" block: what prints, how the number reads, and where it sits.
function OrderOptions({ blk, onChange }: { blk: Block; onChange: (p: Partial<Block>) => void }) {
  const off = blk.hide ?? [];
  const inline = !!blk.inline;
  return (
    <div className="mt-3 space-y-3 pl-7">
      <ChipBar label="Show">
        {PART_LABELS.map(([part, name]) => (
          <Chip
            key={part}
            active={!off.includes(part)}
            onClick={() =>
              onChange({ hide: off.includes(part) ? off.filter((x) => x !== part) : [...off, part] })
            }
          >
            {name}
          </Chip>
        ))}
      </ChipBar>
      {!off.includes("num") && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={blk.label ?? "#"}
            onChange={(e) => onChange({ label: e.target.value })}
            maxLength={30}
            placeholder="No label"
            aria-label="Order number label"
            className="w-40 rounded-fizz border border-ink-line bg-ink px-4 py-2 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
          <span className="text-xs text-steam">before the number — # or a word like Order, Bill</span>
        </div>
      )}
      <ChipBar label="Clock">
        <Chip active={!blk.h24} onClick={() => onChange({ h24: false })}>
          12h · 9:30pm
        </Chip>
        <Chip active={!!blk.h24} onClick={() => onChange({ h24: true })}>
          24h · 21:30
        </Chip>
      </ChipBar>
      <ChipBar label="Layout">
        <Chip active={!inline} onClick={() => onChange({ inline: false })}>
          Stacked
        </Chip>
        <Chip active={inline} onClick={() => onChange({ inline: true })} title="Number left, time right">
          No. + time on one line
        </Chip>
      </ChipBar>
      <ChipBar label="Style">
        {(["left", "center", "right"] as const).map((a) => (
          <Chip key={a} active={(blk.align ?? "left") === a} onClick={() => onChange({ align: a })}>
            {a[0].toUpperCase() + a.slice(1)}
          </Chip>
        ))}
        <Chip active={!!blk.bold} onClick={() => onChange({ bold: !blk.bold })}>
          Bold no.
        </Chip>
        <Chip active={!!blk.big} onClick={() => onChange({ big: !blk.big })}>
          Tall no.
        </Chip>
      </ChipBar>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 rounded-full border border-ink-line text-steam transition-colors hover:border-fizz hover:text-fizz disabled:opacity-30 disabled:hover:border-ink-line disabled:hover:text-steam"
    >
      {children}
    </button>
  );
}

// Thermal paper drawn in printer dots: Font A is 12x24, so a monospace face at
// 20 dots/em (~0.6em advance) lines up column for column.
// ponytail: font advance is approximate; columns are what the printer enforces.
function Paper({ ops, paper }: { ops: PrintOp[]; paper: 58 | 80 }) {
  const s = 0.75; // px per dot
  const dots = paper === 58 ? 384 : 576;
  return (
    <div
      className="rounded-sm bg-cream px-4 py-6 font-mono text-ink"
      style={{ width: dots * s + 32 }}
    >
      <div className="overflow-hidden" style={{ width: dots * s }}>
        {ops.map((o, i) => (
          <div
            key={i}
            style={{
              height: Math.max(o.lh, 24 * o.h) * s,
              textAlign: o.align,
              whiteSpace: "pre",
              fontWeight: o.bold ? 700 : 400,
            }}
          >
            <span
              className="inline-block origin-top"
              style={{
                fontSize: 20 * s * o.w,
                lineHeight: `${24 * s * o.w}px`,
                letterSpacing: o.gap * s * o.w,
                transform: o.h !== o.w ? `scaleY(${o.h / o.w})` : undefined,
              }}
            >
              {ascii(o.text).replaceAll(RUPEE, "₹")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
