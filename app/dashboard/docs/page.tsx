import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import DocsView from "@/components/fizz/docs/DocsView";

export const metadata: Metadata = { title: "Help & docs — Fizz" };

export default async function DocsPage() {
  // Any signed-in user can read the guide.
  await getCurrentUser();
  return <DocsView />;
}
