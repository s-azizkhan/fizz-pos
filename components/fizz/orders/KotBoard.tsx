"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/lib/trpc/client";
import { toast } from "@/lib/store/toast";
import type { KitchenStatus, OrderType } from "@/lib/db/schema";
import type { AppRouter } from "@/lib/trpc/root";

// Inferred from the procedure rather than hand-written, so a schema change
// can't silently drift the board's idea of a ticket.
export type KotOrder = inferRouterOutputs<AppRouter>["orders"]["kot"][number];

// How long a ticket may sit before the board starts shouting. Tuned for a café
// counter — a drink that's been waiting six minutes is already a complaint.
const WARN_S = 180;
const LATE_S = 360;

const POLL_MS = 4000;

const LANES: { key: KitchenStatus; label: string; hint: string }[] = [
  { key: "new", label: "Queue", hint: "Waiting to be accepted" },
  { key: "accepted", label: "Cooking", hint: "Accepted, on the pass" },
  { key: "ready", label: "Ready", hint: "Done — last 30" },
];

const TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "DINE IN",
  takeaway: "TAKEAWAY",
  delivery: "DELIVERY",
};

// One forward step per lane. `ready` is final, so it has no action.
const NEXT: Partial<Record<KitchenStatus, { to: "accepted" | "ready"; label: string }>> = {
  new: { to: "accepted", label: "Accept" },
  accepted: { to: "ready", label: "Mark ready" },
};

// One shared clock for every ticket. useSyncExternalStore rather than a
// state-setting effect: the server snapshot is null, so SSR renders no age at
// all and can't disagree with the client. Snapshots are rounded to the second
// so repeated reads inside a tick are identical (an ever-changing snapshot
// would re-render forever).
function subscribeToClock(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const clockNow = () => Math.floor(Date.now() / 1000) * 1000;
const clockOnServer = () => null;

function ageLabel(seconds: number): string {
  if (seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}:${String(s).padStart(2, "0")}`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// The whole urgency language of the board, in one place.
function urgency(seconds: number) {
  if (seconds >= LATE_S) return { text: "text-[#E2655A]", bar: "bg-[#E2655A]", late: true };
  if (seconds >= WARN_S) return { text: "text-cream", bar: "bg-bubble", late: false };
  return { text: "text-steam", bar: "bg-fizz", late: false };
}

function Ticket({
  order,
  seconds,
  onMove,
}: {
  order: KotOrder;
  seconds: number | null;
  onMove: (to: "accepted" | "ready") => void;
}) {
  const next = NEXT[order.kitchenStatus];
  const tone =
    order.kitchenStatus === "ready"
      ? { text: "text-steam", bar: "bg-ink-line", late: false }
      : urgency(seconds ?? 0);

  return (
    <article className="fizz-ticket flex w-full flex-col overflow-hidden rounded-fizz border border-ink-line bg-ink-soft">
      <div className="flex min-h-0 flex-1">
        {/* Urgency spine — colour does the shouting, not a banner. */}
        <span className={`w-1.5 shrink-0 ${tone.bar} ${tone.late ? "fizz-late" : ""}`} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-ink-line px-5 py-4">
            <div className="min-w-0">
              <p className="font-display text-3xl font-bold leading-none tracking-tight sm:text-[clamp(28px,3vw,40px)]">
                {order.number}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-base font-semibold uppercase tracking-[0.14em] text-steam sm:text-sm">
                <span>{TYPE_LABEL[order.type]}</span>
                {order.reference && (
                  <span className="rounded-full border border-ink-line px-2.5 py-0.5 text-cream">
                    {order.reference}
                  </span>
                )}
                {order.status === "paid" && <span className="text-fizz">PAID</span>}
              </p>
            </div>
            <p
              className={`shrink-0 font-display text-3xl font-bold tabular-nums leading-none sm:text-[clamp(22px,2.4vw,32px)] ${tone.text}`}
              title="Time since the order was rung"
            >
              {seconds === null ? "—" : ageLabel(seconds)}
            </p>
          </header>

          {/* Long tickets scroll inside the card; the fade-free cut at the
              bottom is the cue that there is more below. */}
          <ul className="min-h-0 flex-1 divide-y divide-ink-line/50 overflow-y-auto pb-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-baseline gap-4 px-5 py-4 sm:py-3">
                <span className="min-w-[3rem] shrink-0 rounded-fizz bg-fizz px-2 py-1.5 text-center font-display text-3xl font-bold leading-none text-ink sm:min-w-[2.5rem] sm:py-1 sm:text-2xl">
                  {it.quantity}
                </span>
                <span className="min-w-0">
                  <span className="block text-3xl font-semibold leading-tight text-cream sm:text-[clamp(18px,1.9vw,26px)]">
                    {it.name}
                  </span>
                  {it.variantName && (
                    <span className="block text-lg text-steam sm:text-base">{it.variantName}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {next && (
        <button
          type="button"
          onClick={() => onMove(next.to)}
          className="m-4 mt-auto shrink-0 rounded-fizz bg-fizz px-6 py-5 font-display text-3xl font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95 sm:py-4 sm:text-xl"
        >
          {next.label}
        </button>
      )}
    </article>
  );
}

export default function KotBoard({
  initialLane,
  initialOrders,
  initialCounts,
}: {
  initialLane: KitchenStatus;
  initialOrders: KotOrder[];
  initialCounts: Record<KitchenStatus, number>;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [lane, setLane] = useState<KitchenStatus>(initialLane);
  const now = useSyncExternalStore(subscribeToClock, clockNow, clockOnServer);
  // Tickets the cook just tapped, mapped to the lane they left. They vanish
  // from that lane immediately instead of lingering until the next poll — on a
  // screen you tap while holding a pan, a ticket that doesn't move reads as a
  // missed tap. Storing the lane (not just the id) is what lets the ticket
  // still show up in the lane it moved INTO.
  // ponytail: never pruned. Moves are forward-only so an entry can't wrongly
  // hide anything, and a shift's worth of ids is a rounding error.
  const [moved, setMoved] = useState<Record<string, KitchenStatus>>({});

  // ponytail: polling, not websockets. One café, a handful of tickets, and a
  // 4s round trip the kitchen never notices. Swap for SSE if a second screen
  // ever needs sub-second sync.
  const listOpts = trpc.orders.kot.queryOptions(lane, {
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    initialData: lane === initialLane ? initialOrders : undefined,
  });
  const list = useQuery(listOpts);
  // The DB measured each ticket's age when it answered; the local clock only
  // carries it forward from that moment. Both ends of this subtraction are the
  // browser's own clock, so no server/client offset can leak in.
  const sinceFetch = now === null ? 0 : (now - list.dataUpdatedAt) / 1000;
  // Seeded from the server so the tabs never flash a zero on first paint.
  const counts = useQuery(
    trpc.orders.kotCounts.queryOptions(undefined, {
      refetchInterval: POLL_MS,
      initialData: initialCounts,
    }),
  );

  const move = useMutation(
    trpc.orders.kotMove.mutationOptions({
      onMutate: ({ orderId }) => setMoved((m) => ({ ...m, [orderId]: lane })),
      onSuccess: () => qc.invalidateQueries(),
      // Put it back if the server refused (someone else already moved it).
      onError: (_e, { orderId }) =>
        setMoved((m) => {
          const next = { ...m };
          delete next[orderId];
          return next;
        }),
    }),
  );

  const orders = (list.data ?? []).filter((o) => moved[o.id] !== lane);

  // Mobile shows one ticket at a time. The carousel is native scroll-snap, so
  // the swipe has real momentum and costs no gesture code; the buttons just
  // drive the same scroller for anyone not swiping.
  const [card, setCard] = useState(0);
  // Clamp rather than store a corrected index: the poll can shrink the lane
  // under us (another screen accepted a ticket) and a stale index would blank
  // the deck.
  const at = Math.min(card, Math.max(orders.length - 1, 0));
  const step = (dir: -1 | 1) =>
    setCard(Math.min(Math.max(at + dir, 0), Math.max(orders.length - 1, 0)));

  // Horizontal drag on the deck. Pointer events only, same shape as
  // useSwipeDismiss — the sheet hook is vertical and dismiss-only, so it can't
  // be reused as is.
  const [drag, setDrag] = useState<{ from: number; dx: number } | null>(null);
  const SWIPE_PX = 60;
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => setDrag({ from: e.clientX, dx: 0 }),
    onPointerMove: (e: React.PointerEvent) =>
      setDrag((d) => (d ? { ...d, dx: e.clientX - d.from } : null)),
    onPointerUp: () => {
      if (drag && Math.abs(drag.dx) > SWIPE_PX) step(drag.dx < 0 ? 1 : -1);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
  };

  return (
    <div className="mx-auto max-w-[1800px] px-4 sm:px-6 py-6 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Kitchen
            {/* Proof the board is alive, so nobody reaches for refresh. */}
            <span
              className={`h-2 w-2 rounded-full bg-bubble ${list.isFetching ? "fizz-late" : ""}`}
              title={list.isFetching ? "Refreshing…" : `Auto-refreshes every ${POLL_MS / 1000}s`}
            />
          </p>
          <h1 className="mt-2 hidden font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight sm:block">
            KOT board
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
          }}
          className="rounded-full border border-ink-line px-4 py-2 text-sm font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz"
        >
          Fullscreen
        </button>
      </div>

      {/* Lane tabs. Big targets — these get hit with a knuckle. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {LANES.map((l) => {
          const n = counts.data?.[l.key] ?? 0;
          const active = lane === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setLane(l.key)}
              title={l.hint}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-fizz border px-5 py-3 font-display text-lg font-bold transition-colors ${
                active
                  ? "border-fizz bg-fizz/10 text-fizz"
                  : "border-ink-line text-cream hover:border-fizz/50"
              }`}
            >
              {l.label}
              <span
                className={`rounded-full px-2.5 py-0.5 text-sm tabular-nums ${
                  active ? "bg-fizz text-ink" : "bg-ink text-steam"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 flex min-h-[50vh] items-center justify-center rounded-fizz border border-dashed border-ink-line bg-ink-soft/40 text-center">
          <div>
            <p className="font-display text-3xl font-bold text-fizz">All clear ●</p>
            <p className="mt-2 text-lg text-steam">
              {lane === "new"
                ? "Nothing waiting. The next ticket lands here on its own."
                : lane === "accepted"
                  ? "Nothing on the pass right now."
                  : "No tickets finished yet today."}
            </p>
          </div>
        </div>
      ) : (
        <>
        {/* Mobile: a real deck. The next two tickets sit behind the live one,
            scaled back and lifted, so the queue reads as a pile you push
            through rather than a list you scroll. */}
        <div
          {...swipe}
          className="relative mt-4 h-[46dvh] min-h-[17rem] touch-pan-y select-none sm:hidden"
        >
          {orders.slice(at, at + 3).map((o, depth) => {
            const front = depth === 0;
            return (
              <div
                key={o.id}
                aria-hidden={!front}
                className={`absolute top-0 flex h-full ${
                  front ? "" : "pointer-events-none"
                } ${drag && front ? "" : "transition-transform duration-200"}`}
                // Cards deeper in the pile are WIDER and sit higher, so their
                // edges show past the live one on three sides. That, not a
                // shadow, is what makes it read as a stack.
                style={{
                  zIndex: 10 - depth,
                  left: (2 - depth) * 9,
                  right: (2 - depth) * 9,
                  opacity: front ? 1 : 0.55 - depth * 0.18,
                  transform: front
                    ? `translateX(${drag?.dx ?? 0}px)`
                    : `translateY(-${depth * 13}px)`,
                }}
              >
                <Ticket
                  order={o}
                  seconds={now === null ? null : o.ageSeconds + sinceFetch}
                  onMove={(to) => {
                    move.mutate(
                      { orderId: o.id, to },
                      {
                        onSuccess: () =>
                          toast.success(
                            to === "accepted" ? `${o.number} accepted` : `${o.number} is ready`,
                          ),
                      },
                    );
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* A deck still needs buttons — hands are wet, and Prev has no gesture
            that isn't ambiguous with scrolling the item list. */}
        {orders.length > 1 && (
          <div className="mb-4 mt-4 flex items-center justify-between gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={at === 0}
              className="rounded-fizz border border-ink-line px-6 py-3 font-display text-lg font-bold text-cream transition-colors hover:border-fizz disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="font-display text-lg font-bold tabular-nums text-steam">
              {at + 1} / {orders.length}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={at >= orders.length - 1}
              className="rounded-fizz border border-ink-line px-6 py-3 font-display text-lg font-bold text-cream transition-colors hover:border-fizz disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {/* Desktop keeps the full board — every ticket at once. */}
        <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orders.map((o) => (
            <div key={o.id} className="flex">
              <Ticket
                  order={o}
                  seconds={now === null ? null : o.ageSeconds + sinceFetch}
                  onMove={(to) => {
                    move.mutate(
                      { orderId: o.id, to },
                      {
                        onSuccess: () =>
                          toast.success(
                            to === "accepted" ? `${o.number} accepted` : `${o.number} is ready`,
                          ),
                      },
                    );
                  }}
                />
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
