import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import superjson from "superjson";

// Cross-request data cache for hot, rarely-written reads (store row, menu
// tree, ordering config). Every writer of that data calls bust() — a missed
// bust means stale data until the next write, so keep writes in the routers.
export type CacheTag = "store" | "menu";

// ponytail: unstable_cache is the pre-Cache-Components API; move to
// 'use cache' + cacheTag if the app opts into cacheComponents.
// It stores JSON, so round-trip through superjson to keep Dates as Dates.
export function cached<T>(key: string, tag: CacheTag, load: () => Promise<T>): () => Promise<T> {
  const hit = unstable_cache(async () => superjson.stringify(await load()), [key], { tags: [tag] });
  return async () => superjson.parse<T>(await hit());
}

// Expire now (not stale-while-revalidate): the writer's next read, and every
// POS after it, must see the change — a price or a feature switch can't lag.
export function bust(...tags: CacheTag[]) {
  for (const t of tags) revalidateTag(t, { expire: 0 });
}
