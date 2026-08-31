import Link from "next/link";
import ErrorScreen from "@/components/fizz/ErrorScreen";

export const metadata = { title: "Off-menu — Fizz" };

export default function NotFound() {
  return (
    <ErrorScreen
      status="404"
      eyebrow="Off-menu"
      title="We don't serve this one."
      body="That link points at a page that isn't on the board — moved, renamed, or never existed."
      action={
        <>
          <Link
            href="/dashboard"
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
          >
            Back to the floor
          </Link>
          <Link
            href="/dashboard/docs"
            className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Help &amp; docs
          </Link>
        </>
      }
    />
  );
}
