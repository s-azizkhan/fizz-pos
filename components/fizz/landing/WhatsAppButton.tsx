import { WA_HREF } from "./contact";

export default function WhatsAppButton({
  text = "Hi, I run a café and want to see Fizz.",
  label = "WhatsApp the founder",
  className = "",
}: {
  text?: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={WA_HREF(text)}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line bg-ink-soft px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz ${className}`}
    >
      <span className="text-bubble">●</span> {label}
    </a>
  );
}
