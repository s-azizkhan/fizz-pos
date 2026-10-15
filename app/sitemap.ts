import type { MetadataRoute } from "next";
import { getStore } from "@/lib/store/data";
import { featureOn } from "@/lib/store/features";
import { siteOrigin } from "@/lib/store/public-menu";

// The public pages worth indexing: the landing page and the store's public menu.
// Dashboard, login and API routes never appear (robots disallows them too).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  const store = await getStore();
  const out: MetadataRoute.Sitemap = [{ url: origin, changeFrequency: "monthly", priority: 0.5 }];
  if (store.menuSlug && store.menuPublished && featureOn(store.disabledFeatures, "publicMenu")) {
    const base = `${origin}/m/${store.menuSlug}`;
    out.push(
      { url: base, lastModified: store.updatedAt, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/menu`, lastModified: store.updatedAt, changeFrequency: "weekly", priority: 0.9 },
    );
  }
  return out;
}
