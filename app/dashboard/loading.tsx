// Route-level fallback: navigation is instant and this shimmer stands in until
// the server data lands. Shape mirrors a typical dashboard page (title, stat
// row, list) so the swap to real content doesn't jump.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10" aria-busy>
      <span className="sr-only">Loading</span>
      <div className="fizz-shimmer h-3 w-24 rounded-full" />
      <div className="fizz-shimmer mt-4 h-8 w-2/3 max-w-sm rounded-fizz" />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-fizz border border-ink-line bg-ink-soft p-5"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="fizz-shimmer h-2.5 w-16 rounded-full" />
            <div className="fizz-shimmer mt-4 h-7 w-24 rounded-fizz" />
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-fizz border border-ink-line bg-ink-soft p-4"
          >
            <div className="fizz-shimmer h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="fizz-shimmer h-3 w-1/3 rounded-full" />
              <div className="fizz-shimmer mt-2.5 h-2.5 w-1/2 rounded-full" />
            </div>
            <div className="fizz-shimmer h-6 w-16 shrink-0 rounded-fizz" />
          </div>
        ))}
      </div>
    </div>
  );
}
