"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "./WelcomeCards";

// Two pocket games for the wait, painted with the menu theme vars. No deps:
// Bean Drop is a canvas loop, Latte Match is a DOM grid. Best scores live in
// localStorage on the guest's phone.

const GAMES = [
  { key: "beans", name: "Bean Drop", blurb: "Catch the beans. Miss three and the cup's cold." },
  { key: "match", name: "Latte Match", blurb: "Flip the cards, find the pairs, beat the clock." },
] as const;

function best(key: string): number {
  try {
    return Number(localStorage.getItem(`fizz-game-${key}`) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function saveBest(key: string, v: number, lowerIsBetter = false) {
  const b = best(key);
  if (!b || (lowerIsBetter ? v < b : v > b)) {
    try {
      localStorage.setItem(`fizz-game-${key}`, String(v));
    } catch {}
    return true;
  }
  return false;
}

export default function Games({ accent }: { accent: string }) {
  const [game, setGame] = useState<(typeof GAMES)[number]["key"]>("beans");
  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex gap-2">
        {GAMES.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGame(g.key)}
            className="rounded-full border px-4 py-2 text-[13px] font-bold transition-transform active:scale-95"
            style={
              game === g.key
                ? { backgroundColor: accent, borderColor: accent, color: "var(--m-bg)" }
                : { borderColor: "var(--m-line)", color: "var(--m-text)" }
            }
          >
            {g.name}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-[var(--m-muted)]">{GAMES.find((g) => g.key === game)!.blurb}</p>
      {game === "beans" ? <BeanDrop key="beans" accent={accent} /> : <LatteMatch key="match" accent={accent} />}
    </div>
  );
}

// ---- Bean Drop ---------------------------------------------------------------
// Drag (or tilt a finger across) the cup; beans fall faster as the score climbs.
function BeanDrop({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "play" | "over">("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [burst, setBurst] = useState(0);
  const cupX = useRef(0.5);

  useEffect(() => {
    if (state !== "play") return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(canvas);
    const text = css.getPropertyValue("--m-text").trim() || "#fff";
    const muted = css.getPropertyValue("--m-muted").trim() || "#888";

    type Bean = { x: number; y: number; r: number; v: number; spin: number };
    let beans: Bean[] = [];
    let pts = 0;
    let missed = 0;
    let last = performance.now();
    let raf = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const move = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      cupX.current = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };
    const onPointer = (e: PointerEvent) => move(e.clientX);
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", onPointer);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = 140 + pts * 6;
      if (beans.length < 3 + Math.floor(pts / 8) && rnd() < dt * 1.6) {
        beans.push({ x: 20 + rnd() * (W - 40), y: -12, r: 9 + rnd() * 4, v: speed * (0.8 + rnd() * 0.5), spin: rnd() * 6 });
      }
      const cupW = 64;
      const cx = cupX.current * (W - cupW) + cupW / 2;
      const cupY = H - 34;
      const keep: Bean[] = [];
      for (const b of beans) {
        b.y += b.v * dt;
        b.spin += dt * 3;
        const caught = b.y + b.r >= cupY && b.y < cupY + 10 && Math.abs(b.x - cx) < cupW / 2;
        if (caught) {
          pts++;
          setScore(pts);
        } else if (b.y - b.r > H) {
          missed++;
        } else keep.push(b);
      }
      beans = keep;

      ctx.clearRect(0, 0, W, H);
      // beans
      for (const b of beans) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillStyle = "#6b4226";
        ctx.beginPath();
        ctx.ellipse(0, 0, b.r, b.r * 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3b2314";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -b.r);
        ctx.quadraticCurveTo(b.r * 0.5, 0, 0, b.r);
        ctx.stroke();
        ctx.restore();
      }
      // cup
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx - cupW / 2, cupY);
      ctx.lineTo(cx + cupW / 2, cupY);
      ctx.lineTo(cx + cupW / 2 - 8, cupY + 26);
      ctx.lineTo(cx - cupW / 2 + 8, cupY + 26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx + cupW / 2 + 4, cupY + 12, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // lives
      ctx.fillStyle = muted;
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("●".repeat(3 - missed) + "○".repeat(missed), W - 10, 20);
      ctx.fillStyle = text;
      ctx.textAlign = "left";
      ctx.fillText(String(pts), 10, 20);

      if (missed >= 3) {
        if (saveBest("beans", pts)) {
          setBestScore(pts);
          setBurst((b) => b + 1);
        }
        setState("over");
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointer);
    };
  }, [state, accent]);

  return (
    <div
      className="relative overflow-hidden border"
      style={{ borderRadius: "var(--m-radius)", borderColor: "var(--m-line)", backgroundColor: "var(--m-surface)" }}
    >
      <canvas ref={canvasRef} className="block h-[420px] w-full touch-none" />
      {state !== "play" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--m-bg)]/70 p-6 text-center backdrop-blur-sm">
          {burst > 0 && <Confetti key={burst} accent={accent} />}
          {state === "over" && (
            <>
              <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--m-muted)]">Cup&apos;s cold</p>
              <p className="text-[44px] font-bold leading-none">{score}</p>
            </>
          )}
          {bestScore > 0 && <p className="text-[13px] text-[var(--m-muted)]">Best on this phone: {bestScore}</p>}
          <button
            type="button"
            onClick={() => {
              setScore(0);
              setBestScore(best("beans"));
              setState("play");
            }}
            className="rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-95"
            style={{ backgroundColor: accent, color: "var(--m-bg)" }}
          >
            {state === "over" ? "Again" : "Start"}
          </button>
          <p className="text-[12px] text-[var(--m-muted)]">Drag to move the cup.</p>
        </div>
      )}
    </div>
  );
}

// ---- Latte Match ------------------------------------------------------------
const FACES = ["☕", "🥐", "🍰", "🧁", "🍩", "🥯", "🍪", "🫖"];
function deal(): string[] {
  const cards = [...FACES, ...FACES];
  // Fisher–Yates with Math.random: this runs on the client after a tap, so no
  // SSR mismatch to worry about.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function LatteMatch({ accent }: { accent: string }) {
  const [cards, setCards] = useState<string[] | null>(null);
  const [up, setUp] = useState<number[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [secs, setSecs] = useState(0);
  const [bestMoves, setBestMoves] = useState(0);
  const [burst, setBurst] = useState(0);
  const won = !!cards && done.size === cards.length;

  useEffect(() => {
    if (!cards || won) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [cards, won]);

  const flip = (i: number) => {
    if (!cards || up.length === 2 || up.includes(i) || done.has(i)) return;
    const next = [...up, i];
    setUp(next);
    if (next.length === 2) {
      const m = moves + 1;
      setMoves(m);
      if (cards[next[0]] === cards[next[1]]) {
        const d = new Set(done).add(next[0]).add(next[1]);
        setDone(d);
        setUp([]);
        if (d.size === cards.length) {
          if (saveBest("match", m, true)) setBestMoves(m);
          setBurst((b) => b + 1);
        }
      } else setTimeout(() => setUp([]), 700);
    }
  };
  const start = () => {
    setBestMoves(best("match"));
    setCards(deal());
    setUp([]);
    setDone(new Set());
    setMoves(0);
    setSecs(0);
  };

  return (
    <div
      className="relative overflow-hidden border p-4"
      style={{ borderRadius: "var(--m-radius)", borderColor: "var(--m-line)", backgroundColor: "var(--m-surface)" }}
    >
      <div className="flex items-center justify-between text-[13px] text-[var(--m-muted)]">
        <span>Moves: <b className="text-[var(--m-text)]">{moves}</b></span>
        <span>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
        {bestMoves > 0 && <span>Best: {bestMoves}</span>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {(cards ?? Array<string>(16).fill("")).map((f, i) => {
          const show = up.includes(i) || done.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(i)}
              disabled={!cards}
              className="aspect-square [perspective:600px]"
              aria-label={show ? f : "Hidden card"}
            >
              <span
                className="relative block h-full w-full transition-transform duration-300 [transform-style:preserve-3d]"
                style={{ transform: show ? "rotateY(180deg)" : "none" }}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-[12px] border text-[22px] [backface-visibility:hidden]"
                  style={{ borderColor: "var(--m-line)", backgroundColor: "var(--m-bg)", color: accent }}
                >
                  ●
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-[12px] text-[28px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{ backgroundColor: done.has(i) ? `${accent}33` : "var(--m-bg)", border: `1px solid ${done.has(i) ? accent : "var(--m-line)"}` }}
                >
                  {f}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {(!cards || won) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--m-bg)]/70 p-6 text-center backdrop-blur-sm">
          {burst > 0 && <Confetti key={burst} accent={accent} />}
          {won && (
            <>
              <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--m-muted)]">All paired</p>
              <p className="text-[44px] font-bold leading-none">{moves} moves</p>
            </>
          )}
          <button
            type="button"
            onClick={start}
            className="rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-95"
            style={{ backgroundColor: accent, color: "var(--m-bg)" }}
          >
            {won ? "Again" : "Deal"}
          </button>
        </div>
      )}
    </div>
  );
}
