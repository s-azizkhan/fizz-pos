import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import DocsView from "@/components/fizz/docs/DocsView";
import { getStore, requireFeature } from "@/lib/store/data";

export const metadata: Metadata = { title: "Help & docs — Fizz" };

export default async function DocsPage() {
  await requireFeature("docs");
  // Any signed-in user can read the guide.
  await getCurrentUser();
  return <DocsView off={(await getStore()).disabledFeatures} />;
}
