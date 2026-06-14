import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import ComingSoon from "@/components/fizz/dashboard/ComingSoon";

export const metadata = { title: "Margins — Fizz" };

export default async function MarginsPage() {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");
  return (
    <ComingSoon
      eyebrow="Profit"
      title="Margins"
      blurb="Real cost per cup. Know your margin before you pour."
    />
  );
}
