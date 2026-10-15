"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { best, boardStyle, Overlay, saveBest, themeInk, useDirInput, type Dir } from "./shared";

const N = 16;
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Classic snake on a 16x16 grid. Eat beans, grow, speed up. Swipe or arrows.
export default function Snake({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"idle" | "play" | "over">("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [burst, setBurst] = useState(0);
  const dir = useRef<Dir>("right");
  const queued = useRef<Dir | null>(null);

  const onDir = useCallback((d: Dir) => {
    // Queue one turn per tick; never a straight reversal into yourself.
    const cur = queued.current ?? dir.current;
    if (OPP[cur] !== d) queued.current = d;
  }, []);
  useDirInput(canvas, onDir, state === "play");

  useEffect(() => {
    if (state !== "play") return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = c.clientWidth;
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cell = size / N;
    const ink = themeInk(c);

    const snake: [number, number][] = [[5, 8], [4, 8], [3, 8]];
    dir.current = "right";
    queued.current = null;
    let pts = 0;
    let bean = place();
    let timer = 0;

    function place(): [number, number] {
      let p: [number, number];
      do p = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
      while (snake.some(([x, y]) => x === p[0] && y === p[1]));
      return p;
    }
    function draw() {
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = ink.line;
      ctx.lineWidth = 1;
      for (let i = 1; i < N; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
        ctx.stroke();
      }
      ctx.fillStyle = "#6b4226";
      ctx.beginPath();
      ctx.ellipse(bean[0] * cell + cell / 2, bean[1] * cell + cell / 2, cell * 0.3, cell * 0.4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      snake.forEach(([x, y], i) => {
        ctx.fillStyle = i === 0 ? accent : `${accent}${i % 2 ? "cc" : "99"}`;
        const pad = i === 0 ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(x * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2, 4);
        ctx.fill();
      });
      ctx.fillStyle = ink.text;
      ctx.font = "bold 14px system-ui";
      ctx.fillText(String(pts), 8, 18);
    }
    function tick() {
      if (queued.current) {
        dir.current = queued.current;
        queued.current = null;
      }
      const [dx, dy] = STEP[dir.current];
      const head: [number, number] = [snake[0][0] + dx, snake[0][1] + dy];
      const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N;
      const hitSelf = snake.some(([x, y]) => x === head[0] && y === head[1]);
      if (hitWall || hitSelf) {
        if (saveBest("snake", pts)) {
          setBestScore(pts);
          setBurst((b) => b + 1);
        }
        setState("over");
        return;
      }
      snake.unshift(head);
      if (head[0] === bean[0] && head[1] === bean[1]) {
        pts++;
        setScore(pts);
        bean = place();
      } else snake.pop();
      draw();
      timer = window.setTimeout(tick, Math.max(70, 160 - pts * 4));
    }
    draw();
    timer = window.setTimeout(tick, 160);
    return () => clearTimeout(timer);
  }, [state, accent]);

  return (
    <div className="relative overflow-hidden border" style={boardStyle}>
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          setCanvas(el);
        }}
        className="block aspect-square w-full touch-none"
      />
      {state !== "play" && (
        <Overlay
          accent={accent}
          burst={burst}
          title={state === "over" ? "Tangled" : undefined}
          big={state === "over" ? score : undefined}
          bestLabel={bestScore > 0 ? `Best on this phone: ${bestScore}` : null}
          cta={state === "over" ? "Again" : "Start"}
          hint="Swipe to turn. Arrow keys work too."
          onStart={() => {
            setScore(0);
            setBestScore(best("snake"));
            setState("play");
          }}
        />
      )}
    </div>
  );
}
