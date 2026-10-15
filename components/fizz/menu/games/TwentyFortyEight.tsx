"use client";

import { useCallback, useRef, useState } from "react";
import { best, boardStyle, Overlay, saveBest, useDirInput, type Dir } from "./shared";

type Grid = number[][];
const empty = (): Grid => Array.from({ length: 4 }, () => Array(4).fill(0));

function spawn(g: Grid): Grid {
  const free: [number, number][] = [];
  g.forEach((row, y) => row.forEach((v, x) => !v && free.push([x, y])));
  if (!free.length) return g;
  const [x, y] = free[Math.floor(Math.random() * free.length)];
  const n = g.map((r) => [...r]);
  n[y][x] = Math.random() < 0.9 ? 2 : 4;
  return n;
}

// Slide one row left, merging once per pair. Returns the row + points earned.
function slide(row: number[]): [number[], number] {
  const a = row.filter(Boolean);
  let pts = 0;
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i] === a[i + 1]) {
      a[i] *= 2;
      pts += a[i];
      a.splice(i + 1, 1);
    }
  }
  while (a.length < 4) a.push(0);
  return [a, pts];
}

function move(g: Grid, d: Dir): [Grid, number, boolean] {
  const rot = (m: Grid) => m[0].map((_, x) => m.map((r) => r[x]).reverse()); // 90° cw
  let m = g;
  const turns = { left: 0, up: 1, right: 2, down: 3 }[d];
  for (let i = 0; i < turns; i++) m = rot(m);
  let pts = 0;
  m = m.map((r) => {
    const [n, p] = slide(r);
    pts += p;
    return n;
  });
  for (let i = 0; i < (4 - turns) % 4; i++) m = rot(m);
  const moved = m.some((r, y) => r.some((v, x) => v !== g[y][x]));
  return [m, pts, moved];
}

const stuck = (g: Grid) => (["up", "down", "left", "right"] as Dir[]).every((d) => !move(g, d)[2]);

// 2048 with swipe/arrows. Score = merged tile values, best kept on the phone.
export default function TwentyFortyEight({ accent }: { accent: string }) {
  const [board, setBoard] = useState<HTMLDivElement | null>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [over, setOver] = useState(false);
  const [burst, setBurst] = useState(0);
  const [won, setWon] = useState(false);
  // Latest grid/score for the input handler, so swipes in one frame don't
  // read stale state and side effects stay out of React updaters.
  const live = useRef({ grid: null as Grid | null, score: 0, won: false });

  const onDir = useCallback((d: Dir) => {
    const g = live.current.grid;
    if (!g) return;
    const [n, pts, moved] = move(g, d);
    if (!moved) return;
    const next = spawn(n);
    const total = live.current.score + pts;
    live.current = { ...live.current, grid: next, score: total };
    setGrid(next);
    setScore(total);
    if (!live.current.won && next.some((r) => r.some((v) => v >= 2048))) {
      live.current.won = true;
      setWon(true);
      setBurst((b) => b + 1);
    }
    if (stuck(next)) {
      setOver(true);
      if (saveBest("2048", total)) {
        setBestScore(total);
        setBurst((b) => b + 1);
      }
    }
  }, []);
  useDirInput(board, onDir, !!grid && !over);

  const start = () => {
    setBestScore(best("2048"));
    const g = spawn(spawn(empty()));
    live.current = { grid: g, score: 0, won: false };
    setGrid(g);
    setScore(0);
    setOver(false);
    setWon(false);
  };
  // Tile tint deepens with the value; text flips dark once the tile is bright.
  const tile = (v: number) => {
    if (!v) return { backgroundColor: "var(--m-bg)", color: "transparent" };
    const step = Math.min(10, Math.log2(v));
    const a = Math.round(0x22 + step * 0x14).toString(16).padStart(2, "0");
    return { backgroundColor: `${accent}${a}`, color: step >= 6 ? "var(--m-bg)" : "var(--m-text)", borderColor: step >= 6 ? accent : "var(--m-line)" };
  };

  return (
    <div className="relative overflow-hidden border p-3" style={boardStyle}>
      <div className="flex items-center justify-between px-1 text-[13px] text-[var(--m-muted)]">
        <span>
          Score: <b className="text-[var(--m-text)]">{score}</b>
        </span>
        {won && <span style={{ color: accent }}>2048! Keep going</span>}
        {bestScore > 0 && <span>Best: {bestScore}</span>}
      </div>
      <div ref={setBoard} className="mt-3 grid aspect-square grid-cols-4 gap-2 touch-none select-none">
        {(grid ?? empty()).flat().map((v, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-[12px] border text-[clamp(14px,5.5vw,24px)] font-bold tabular-nums transition-colors duration-150"
            style={{ borderColor: "var(--m-line)", ...tile(v) }}
          >
            {v || ""}
          </div>
        ))}
      </div>
      {(!grid || over) && (
        <Overlay
          accent={accent}
          burst={burst}
          title={over ? "No moves left" : undefined}
          big={over ? score : undefined}
          bestLabel={bestScore > 0 ? `Best on this phone: ${bestScore}` : null}
          cta={over ? "Again" : "Start"}
          hint="Swipe to slide. Same numbers merge."
          onStart={start}
        />
      )}
    </div>
  );
}
