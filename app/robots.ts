import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/store/public-menu";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/"],
        disallow: ["/dashboard", "/api/", "/login", "/logout", "/join", "/menu-pdf"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
