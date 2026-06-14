import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import ComingSoon from "@/components/fizz/dashboard/ComingSoon";

export const metadata = { title: "Team — Fizz" };

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return (
    <ComingSoon
      eyebrow="Admin"
      title="Team & roles"
      blurb="Add staff, set permissions, manage who runs the floor."
    />
  );
}
