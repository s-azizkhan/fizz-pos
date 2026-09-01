"use client";

import { useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/lib/trpc/client";
import { toast } from "@/lib/store/toast";
import type { KitchenStatus, OrderType } from "@/lib/db/schema";
import type { AppRouter } from "@/lib/trpc/root";

// Inferred from the procedure rather than hand-written, so a schema change
// can't silently drift the board's idea of a ticket.
export type KotOrder = inferRouterOutputs<AppRouter>["orders"]["kot"][number];
export type LaneData = Record<KitchenStatus, KotOrder[]>;

// How long a ticket may sit before the board starts shouting. Tuned for a cafe
// counter — a drink that's been waiting six minutes is already a complaint.
const WARN_S = 180;
const LATE_S = 360;

const POLL_MS = 4000;

type LaneDef = {
  key: KitchenStatus;
  label: string;
  /** Reads as the lane's "temperature": hot work first, done work last. */
  dot: string;
  empty: string;
};

const LANES: LaneDef[] = [
  { key: "new", label: "Queue", dot: "bg-fizz", empty: "Nothing waiting." },
  { key: "accepted", label: "On the pass", dot: "bg-bubble", empty: "Nothing cooking." },
  { key: "ready", label: "Ready", dot: "bg-steam", empty: "Nothing finished yet." },
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

// The whole urgency language of the board, in one place. Colour carries the
// pressure so a cook reads a ticket's state from across the room, before the
// digits are even legible.
function urgency(seconds: number, done: boolean) {
  if (done) return { text: "text-steam", fill: "bg-ink-line", late: false };
  if (seconds >= LATE_S) return { text: "text-[#E2655A]", fill: "bg-[#E2655A]", late: true };
  if (seconds >= WARN_S) return { text: "text-cream", fill: "bg-bubble", late: false };
  return { text: "text-fizz", fill: "bg-fizz", late: false };
}

// A ticket's age as a bar that fills toward "late". Reads at a glance from
// twice the distance the digits do.
function PressureBar({ seconds, done }: { seconds: number | null; done: boolean }) {
  const tone = urgency(seconds ?? 0, done);
  const pct = seconds === null || done ? 0 : Math.min(100, (seconds / LATE_S) * 100);
  return (
    <div className="h-1 w-full bg-ink" aria-hidden>
      <div
        className={`h-full transition-[width] duration-1000 ease-linear ${tone.fill} ${
          tone.late ? "fizz-late" : ""
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Ticket({
  order,
  seconds,
  onMove,
  size,
  nextUp = false,
  animate = false,
}: {
  order: KotOrder;
  seconds: number | null;
  onMove: (to: "accepted" | "ready") => void;
  /** `lane` packs three columns onto a screen; `deck` owns a whole phone. */
  size: "lane" | "deck";
  nextUp?: boolean;
  animate?: boolean;
}) {
  const step = NEXT[order.kitchenStatus];
  const done = order.kitchenStatus === "ready";
  const tone = urgency(seconds ?? 0, done);
  const deck = size === "deck";

  return (
    <article
      // The View Transitions API morphs an element between two DOM states when
      // both carry the same name — that is what makes a ticket physically glide
      // from Queue to On the pass instead of blinking there.
      style={animate ? { viewTransitionName: `kot-${order.id}` } : undefined}
      // shrink-0 in a lane: the column is a flex scroller, and without it every
      // card is squeezed to fit and its item list gets clipped.
      className={`fizz-ticket flex w-full flex-col overflow-hidden rounded-fizz border bg-ink-soft transition-colors ${
        deck ? "" : "shrink-0"
      } ${nextUp ? "border-fizz/60" : "border-ink-line"} ${done ? "opacity-70" : ""}`}
    >
      <PressureBar seconds={seconds} done={done} />

      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          {nextUp && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-fizz">
              Next up
            </p>
          )}
          <p
            className={`font-display font-bold leading-none tracking-tight ${
              deck ? "text-3xl" : "text-2xl xl:text-[26px]"
            }`}
          >
            {order.number}
          </p>
          <p
            className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold uppercase tracking-[0.14em] text-steam ${
              deck ? "text-sm" : "text-xs"
            }`}
          >
            <span>{TYPE_LABEL[order.type]}</span>
            {order.reference && (
              <span className="rounded-full border border-ink-line px-2 py-0.5 text-cream">
                {order.reference}
              </span>
            )}
            {order.status === "paid" && <span className="text-fizz">PAID</span>}
          </p>
        </div>

        <p
          className={`shrink-0 font-display font-bold tabular-nums leading-none ${tone.text} ${
            deck ? "text-3xl" : "text-2xl xl:text-[28px]"
          }`}
          title="Time since the order was rung"
        >
          {seconds === null ? "—" : ageLabel(seconds)}
        </p>
      </header>

      <ul
        className={`min-h-0 flex-1 divide-y divide-ink-line/40 border-t border-ink-line/60 ${
          deck ? "overflow-y-auto" : ""
        }`}
      >
        {order.items.map((it) => (
          <li
            key={it.id}
            className={`flex items-baseline gap-3 px-4 ${deck ? "py-3.5" : "py-2.5"}`}
          >
            <span
              className={`shrink-0 rounded-[10px] bg-fizz text-center font-display font-bold leading-none text-ink ${
                deck ? "min-w-[2.75rem] px-2 py-1.5 text-3xl" : "min-w-[2rem] px-1.5 py-1 text-xl"
              }`}
            >
              {it.quantity}
            </span>
            <span className="min-w-0">
              <span
                className={`block font-semibold leading-tight text-cream ${
                  deck ? "text-3xl" : "text-lg xl:text-xl"
                }`}
              >
                {it.name}
              </span>
              {it.variantName && (
                <span className={`block text-steam ${deck ? "text-lg" : "text-sm"}`}>
                  {it.variantName}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {step && (
        <button
          type="button"
          onClick={() => onMove(step.to)}
          className={`m-3 mt-auto shrink-0 rounded-fizz bg-fizz font-display font-bold text-ink transition-transform hover:scale-[1.02] active:scale-[0.97] ${
            deck ? "py-5 text-3xl" : "py-3 text-lg"
          }`}
        >
          {step.label}
        </button>
      )}
    </article>
  );
}

function EmptyLane({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-fizz border border-dashed border-ink-line/70 py-10 text-center text-sm text-steam">
      {text}
    </div>
  );
}

export default function KotBoard({
  initial,
  initialCounts,
}: {
  initial: LaneData;
  initialCounts: Record<KitchenStatus, number>;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const now = useSyncExternalStore(subscribeToClock, clockNow, clockOnServer);

  // Every lane is on screen at once on a big display, so all three stay live.
  // httpBatchLink folds them into a single request per tick.
  const laneOpts = (l: KitchenStatus) =>
    trpc.orders.kot.queryOptions(l, {
      refetchInterval: POLL_MS,
      refetchOnWindowFocus: true,
      initialData: initial[l],
    });
  const queues = {
    new: useQuery(laneOpts("new")),
    accepted: useQuery(laneOpts("accepted")),
    ready: useQuery(laneOpts("ready")),
  };
  const counts = useQuery(
    trpc.orders.kotCounts.queryOptions(undefined, {
      refetchInterval: POLL_MS,
      initialData: initialCounts,
    }),
  );

  // The DB measured each ticket's age when it answered; the local clock only
  // carries it forward from that moment. Both ends of this subtraction are the
  // browser's own clock, so no server/client offset can leak in.
  const ageOf = (o: KotOrder, l: KitchenStatus) =>
    now === null ? null : o.ageSeconds + (now - queues[l].dataUpdatedAt) / 1000;

  // Move a ticket between cached lanes so the card animates immediately instead
  // of waiting out the poll. Wrapped in a view transition, this is the glide.
  // Returns a promise that settles once the card has landed.
  function shift(orderId: string, to: "accepted" | "ready"): Promise<void> {
    const from: KitchenStatus = to === "accepted" ? "new" : "accepted";
    const fromKey = trpc.orders.kot.queryOptions(from).queryKey;
    const toKey = trpc.orders.kot.queryOptions(to).queryKey;
    const countsKey = trpc.orders.kotCounts.queryOptions().queryKey;

    const source = qc.getQueryData(fromKey);
    const ticket = source?.find((o) => o.id === orderId);
    if (!source || !ticket) return Promise.resolve();

    return withViewTransition(() => {
      qc.setQueryData(
        fromKey,
        source.filter((o) => o.id !== orderId),
      );
      qc.setQueryData(toKey, (old) => {
        if (!old) return old;
        const moved = { ...ticket, kitchenStatus: to };
        // Queue and pass are oldest-first; Ready is newest-first.
        return to === "ready" ? [moved, ...old] : [...old, moved];
      });
      qc.setQueryData(countsKey, (c) =>
        c ? { ...c, [from]: Math.max(0, c[from] - 1), [to]: c[to] + 1 } : c,
      );
    });
  }

  const move = useMutation(
    trpc.orders.kotMove.mutationOptions({
      // onMutate's return value is handed back to onSettled as context — the
      // one place to park the in-flight glide without a ref or a module global.
      onMutate: ({ orderId, to }) => ({ glide: shift(orderId, to) }),
      // Whatever the server decided wins; a refetch repairs an optimistic move
      // the server refused (another screen got there first). Held until the
      // card has landed: a refetch mid-flight can briefly put one ticket in two
      // lanes, and two elements sharing a view-transition-name abort the glide.
      onSettled: (_data, _error, _vars, ctx) =>
        (ctx?.glide ?? Promise.resolve()).then(() => qc.invalidateQueries()),
    }),
  );

  function act(o: KotOrder, to: "accepted" | "ready") {
    move.mutate(
      { orderId: o.id, to },
      {
        onSuccess: () =>
          toast.success(to === "accepted" ? `${o.number} accepted` : `${o.number} is ready`),
      },
    );
  }

  // --- Mobile deck ----------------------------------------------------------
  const [lane, setLane] = useState<KitchenStatus>("new");
  const deckOrders = queues[lane].data ?? [];
  const [card, setCard] = useState(0);
  // Clamp rather than store a corrected index: the poll can shrink the lane
  // under us and a stale index would blank the deck.
  const at = Math.min(card, Math.max(deckOrders.length - 1, 0));
  const step = (dir: -1 | 1) =>
    setCard(Math.min(Math.max(at + dir, 0), Math.max(deckOrders.length - 1, 0)));

  // Horizontal drag on the deck. Pointer events only, same shape as
  // useSwipeDismiss — that hook is vertical and dismiss-only, so it can't be
  // reused as is.
  const [drag, setDrag] = useState<{ from: number; dx: number } | null>(null);
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => setDrag({ from: e.clientX, dx: 0 }),
    onPointerMove: (e: React.PointerEvent) =>
      setDrag((d) => (d ? { ...d, dx: e.clientX - d.from } : null)),
    onPointerUp: () => {
      if (drag && Math.abs(drag.dx) > 60) step(drag.dx < 0 ? 1 : -1);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
  };

  const oldest = queues.new.data?.[0];
  const oldestAge = oldest ? ageOf(oldest, "new") : null;
  const oldestTone = urgency(oldestAge ?? 0, false);

  return (
    <div className="mx-auto flex max-w-[1900px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Kitchen
            {/* Proof the board is alive, so nobody reaches for refresh. */}
            <span
              className={`h-2 w-2 rounded-full bg-bubble ${
                queues.new.isFetching ? "fizz-late" : ""
              }`}
              title={`Auto-refreshes every ${POLL_MS / 1000}s`}
            />
          </p>
          <h1 className="mt-1.5 hidden font-display text-[clamp(26px,4vw,38px)] font-bold tracking-tight sm:block">
            KOT board
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* The one number a head chef actually watches. */}
          {oldestAge !== null && (
            <div className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-steam">
                Longest wait
              </p>
              <p className={`font-display text-xl font-bold tabular-nums ${oldestTone.text}`}>
                {ageLabel(oldestAge)}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else document.documentElement.requestFullscreen().catch(() => {});
            }}
            className="hidden rounded-full border border-ink-line px-4 py-2 text-sm font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz sm:block"
          >
            Fullscreen
          </button>
        </div>
      </div>

      {/* Desktop: every lane at once. A kitchen should never click to find work. */}
      <div className="mt-6 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {LANES.map((l) => {
          const rows = queues[l.key].data ?? [];
          return (
            <section key={l.key} className="flex min-h-0 flex-col">
              <header className="flex items-center gap-2.5 border-b border-ink-line pb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
                <h2 className="font-display text-lg font-bold tracking-tight">{l.label}</h2>
                <span className="ml-auto rounded-full bg-ink px-2.5 py-0.5 font-display text-sm font-bold tabular-nums text-steam">
                  {counts.data?.[l.key] ?? rows.length}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto pt-3 lg:max-h-[calc(100dvh-16rem)]">
                {rows.length === 0 ? (
                  <EmptyLane text={l.empty} />
                ) : (
                  rows.map((o, i) => (
                    <Ticket
                      key={o.id}
                      order={o}
                      seconds={ageOf(o, l.key)}
                      size="lane"
                      animate
                      nextUp={l.key === "new" && i === 0}
                      onMove={(to) => act(o, to)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Mobile: one big ticket, the rest stacked behind it. ---------------- */}
      <div className="sm:hidden">
        <div className="mt-4 flex gap-2">
          {LANES.map((l) => {
            const active = lane === l.key;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => {
                  setLane(l.key);
                  setCard(0);
                }}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-2 rounded-fizz border px-2 py-3 font-display text-base font-bold transition-colors ${
                  active ? "border-fizz bg-fizz/10 text-fizz" : "border-ink-line text-cream"
                }`}
              >
                {l.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    active ? "bg-fizz text-ink" : "bg-ink text-steam"
                  }`}
                >
                  {counts.data?.[l.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {deckOrders.length === 0 ? (
          <div className="mt-4 flex h-[46dvh] items-center justify-center rounded-fizz border border-dashed border-ink-line bg-ink-soft/40 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-fizz">All clear ●</p>
              <p className="mt-2 text-steam">{LANES.find((l) => l.key === lane)?.empty}</p>
            </div>
          </div>
        ) : (
          <>
            <div
              {...swipe}
              className="relative mt-4 h-[46dvh] min-h-[17rem] touch-pan-y select-none"
            >
              {deckOrders.slice(at, at + 3).map((o, depth) => {
                const front = depth === 0;
                return (
                  <div
                    key={o.id}
                    aria-hidden={!front}
                    className={`absolute top-0 flex h-full ${front ? "" : "pointer-events-none"} ${
                      drag && front ? "" : "transition-all duration-200"
                    }`}
                    // Cards deeper in the pile are WIDER and sit higher, so
                    // their edges show past the live one on three sides. That,
                    // not a shadow, is what makes it read as a stack.
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
                      seconds={ageOf(o, lane)}
                      size="deck"
                      nextUp={lane === "new" && at + depth === 0}
                      onMove={(to) => act(o, to)}
                    />
                  </div>
                );
              })}
            </div>

            {deckOrders.length > 1 && (
              <div className="mb-4 mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={at === 0}
                  className="rounded-fizz border border-ink-line px-6 py-3 font-display text-lg font-bold text-cream transition-colors disabled:opacity-40"
                >
                  &larr; Prev
                </button>
                <span className="font-display text-lg font-bold tabular-nums text-steam">
                  {at + 1} / {deckOrders.length}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={at >= deckOrders.length - 1}
                  className="rounded-fizz border border-ink-line px-6 py-3 font-display text-lg font-bold text-cream transition-colors disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Run a DOM update as a view transition when the browser offers one, so tickets
// glide between lanes. flushSync is required: the API needs the DOM mutated
// synchronously inside the callback, and React would otherwise batch it.
type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

/** Returns a promise that settles once the card has landed. Never rejects. */
function withViewTransition(update: () => void): Promise<void> {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => ViewTransition;
  };
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !doc.startViewTransition) {
    update();
    return Promise.resolve();
  }
  try {
    const transition = doc.startViewTransition(() => flushSync(update));
    // A transition is SKIPPED whenever another starts first, the tab is
    // hidden, or two elements share a name. The DOM still updates, so this is
    // recoverable — but every one of these promises rejects, and an uncaught
    // rejection surfaces as "InvalidStateError: Transition was aborted".
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    return transition.finished.catch(() => {});
  } catch {
    // Older engines throw synchronously instead of rejecting.
    update();
    return Promise.resolve();
  }
}
