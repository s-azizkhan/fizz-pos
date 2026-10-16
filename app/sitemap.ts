import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { store } from "@/lib/db/schema";
import { featureOn } from "@/lib/store/features";
import { siteOrigin } from "@/lib/store/public-menu";
import { menuUrl } from "@/lib/store/menu-path";

// The public pages worth indexing: the landing page and every published menu.
// Dashboard, login and API routes never appear (robots disallows them too).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  const out: MetadataRoute.Sitemap = [{ url: origin, changeFrequency: "monthly", priority: 0.5 }];
  const rows = await db
    .select({ menuSlug: store.menuSlug, menuDomain: store.menuDomain, disabledFeatures: store.disabledFeatures, updatedAt: store.updatedAt })
    .from(store)
    .where(eq(store.menuPublished, true));
  for (const s of rows) {
    // A café on its own domain is indexed there, not under /m/.
    if (!s.menuSlug || s.menuDomain || !featureOn(s.disabledFeatures, "publicMenu")) continue;
    const base = menuUrl(origin, s.menuSlug);
    out.push(
      { url: base, lastModified: s.updatedAt, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/menu`, lastModified: s.updatedAt, changeFrequency: "weekly", priority: 0.9 },
    );
  }
  return out;
}
