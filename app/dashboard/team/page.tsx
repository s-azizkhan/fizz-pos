import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import TeamBoard from "@/components/fizz/team/TeamBoard";

export const metadata: Metadata = { title: "Team — Fizz" };

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const api = await trpc();
  const { members, pending } = await api.team.list();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Admin
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Team &amp; roles
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Add staff, set permissions, manage who runs the floor.
      </p>

      <div className="mt-10">
        <TeamBoard members={members} pending={pending} currentUserId={user.id} />
      </div>
    </div>
  );
}
