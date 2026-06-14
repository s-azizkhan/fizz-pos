import { redirect } from "next/navigation";

// `/docs` is a friendly alias for the in-app guide that lives in the dashboard.
export default function DocsRedirect() {
  redirect("/dashboard/docs");
}
