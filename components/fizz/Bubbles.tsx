type Bubble = {
  size: number;
  left: number;
  duration: number;
  delay: number;
};

const COUNT = 26;

// Deterministic spread (matches brand.html) so SSR and client markup agree —
// the rise animation is pure CSS, so no client JS is needed.
const BUBBLES: Bubble[] = Array.from({ length: COUNT }, (_, i) => ({
  size: 6 + ((i * 37) % 30),
  left: (i * 53) % 100,
  duration: 7 + ((i * 31) % 9),
  delay: (i * 17) % 11,
}));

export default function Bubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="fizz-bubble"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}vw`,
            animationDuration: `${b.duration}s`,
            animationDelay: `-${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
