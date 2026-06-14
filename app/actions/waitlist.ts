"use server";

import { db } from "@/lib/db";
import { waitlist, waitlistForm } from "@/lib/db/schema";

export type WaitlistState = { ok: boolean; error?: string };

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistForm.safeParse({
    email: formData.get("email"),
    cafeName: formData.get("cafeName") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db
      .insert(waitlist)
      .values({ email: parsed.data.email, cafeName: parsed.data.cafeName ?? null })
      .onConflictDoNothing();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
