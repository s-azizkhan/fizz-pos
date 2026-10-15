import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/dal";

const KINDS = new Set(["logo", "cover"]);
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 3 * 1024 * 1024; // the client resizes first; this is the hard stop

// POST multipart { file, kind } → { url: "/api/img/<id>" }. Admin/manager only.
// Keeps one image per kind: the previous one is dropped after the new insert.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return Response.json({ error: "Sign in as an admin to upload." }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "");
  if (!(file instanceof File) || !KINDS.has(kind)) {
    return Response.json({ error: "Send an image and what it's for." }, { status: 400 });
  }
  if (!MIMES.has(file.type)) return Response.json({ error: "Use a JPG, PNG or WebP." }, { status: 415 });
  if (file.size > MAX) return Response.json({ error: "Keep it under 3 MB." }, { status: 413 });
  const data = Buffer.from(await file.arrayBuffer());
  // Sniff the magic bytes — the declared type is just a header.
  const ok =
    (data[0] === 0xff && data[1] === 0xd8) || // jpeg
    (data[0] === 0x89 && data[1] === 0x50) || // png
    (data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP");
  if (!ok) return Response.json({ error: "That file isn't an image." }, { status: 415 });

  const [row] = await db
    .insert(images)
    .values({ storeId: user.storeId, kind, mime: file.type, size: data.length, data })
    .returning({ id: images.id });
  await db.delete(images).where(and(eq(images.storeId, user.storeId), eq(images.kind, kind), ne(images.id, row.id)));
  return Response.json({ url: `/api/img/${row.id}` });
}
