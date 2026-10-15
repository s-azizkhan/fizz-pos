import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

// Public, immutable: an id is never reused, so browsers and CDNs may cache hard.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [img] = await db.select().from(images).where(eq(images.id, id)).limit(1);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "content-type": img.mime,
      "content-length": String(img.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
