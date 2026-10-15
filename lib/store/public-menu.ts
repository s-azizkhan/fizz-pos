import "server-only";
import type { Metadata } from "next";
import { trpc } from "@/lib/trpc/server";

// Shared by /m/[slug] and /m/[slug]/menu.
export type PublicSearch = Promise<{ viewOnly?: string; t?: string }>;

// Table QR codes carry ?t=5. Kept short so it fits a badge.
export function tableParam(t: string | undefined): string | null {
  const v = (t ?? "").trim().slice(0, 12);
  return v || null;
}

export async function menuMetadata(slug: string): Promise<Metadata> {
  const menu = await (await trpc()).menu.public(slug);
  if (!menu) return { title: "Menu not found" };
  return {
    title: `${menu.store.name} — Menu`,
    description: menu.store.menuTagline ?? `The menu at ${menu.store.name}.`,
  };
}
