"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, loginForm } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginForm.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  // Same generic message + always run a hash compare so timing doesn't leak
  // whether the email exists.
  const fallbackHash =
    "0000000000000000000000000000000000000000000000000000000000000000.0000000000000000000000000000000000000000000000000000000000000000";
  const ok = await verifyPassword(password, user?.passwordHash ?? fallbackHash);

  if (!user || !ok) {
    return { error: "Wrong email or password." };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
