"use client";

// Last line of defence: this replaces the root layout, so it ships its own
// <html>/<body> and cannot rely on fonts, globals.css, or any shared component.
// Everything it needs is inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0E1116",
          color: "#F4F1E9",
          font: '400 16px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif',
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: "34ch" }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Fi<span style={{ color: "#C6F432" }}>zz</span>
            <sup style={{ color: "#38E1D6", fontSize: 11 }}>&bull;</sup>
          </div>
          <p
            style={{
              margin: "26px 0 0",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#E2655A",
            }}
          >
            Everything fizzled
          </p>
          <h1
            style={{
              fontSize: "clamp(26px,7vw,34px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "14px 0 10px",
            }}
          >
            The whole app tripped.
          </h1>
          <p style={{ color: "#8A93A1", margin: 0 }}>
            Reload to get back on the floor. Your data is untouched.
          </p>
          {error.digest && (
            <code
              style={{
                display: "block",
                marginTop: 20,
                fontSize: 12,
                color: "#8A93A1",
                wordBreak: "break-all",
              }}
            >
              {error.digest}
            </code>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              background: "#C6F432",
              color: "#0E1116",
              border: 0,
              fontWeight: 600,
              fontSize: 16,
              padding: "13px 26px",
              borderRadius: 18,
              cursor: "pointer",
            }}
          >
            Reload Fizz
          </button>
        </div>
      </body>
    </html>
  );
}
