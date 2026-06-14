import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import ComingSoon from "@/components/fizz/dashboard/ComingSoon";

export const metadata = { title: "Inventory — Fizz" };

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");
  return (
    <ComingSoon
      eyebrow="Stock"
      title="Inventory"
      blurb="Track every ingredient, live — no more counting by hand."
    />
  );
}
