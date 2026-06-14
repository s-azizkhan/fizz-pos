import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { navForRole } from "@/components/fizz/dashboard/nav-items";
import { CURRENCIES } from "@/lib/store/currencies";
import type { UserRole } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Dashboard — Fizz" };

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Owner",
  manager: "Manager",
  staff: "Barista",
};

export default async function DashboardPage() {
  const [user, store] = await Promise.all([getCurrentUser(), getStore()]);
  // Action tiles = nav minus the Dashboard entry itself.
  const tiles = navForRole(user.role).filter((i) => i.href !== "/dashboard");
  const currency =
    CURRENCIES.find((c) => c.code === store.currency)?.symbol ?? store.currency;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        {ROLE_LABEL[user.role]} view · {store.name}
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Morning, {user.name.split(" ")[0]}.
      </h1>

      <div className="mt-6 grid auto-rows-[140px] grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {/* Hero tile */}
        <section className="relative col-span-2 row-span-2 flex flex-col justify-between overflow-hidden rounded-fizz border border-fizz/30 bg-fizz/[0.07] p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              The floor&apos;s yours
            </p>
            <h2 className="mt-3 max-w-[16ch] font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
              Fast at the counter. Sharp in the back office.
            </h2>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-steam">Open today</p>
              <p className="font-display text-lg font-bold text-cream sm:text-xl">
                {store.openingTime} — {store.closingTime}
              </p>
            </div>
            <span className="font-display text-4xl font-bold text-fizz/30 sm:text-5xl">
              {currency}
            </span>
          </div>
        </section>

        {/* Stat tiles */}
        <Stat label="Timezone" value={store.timezone} />
        <Stat label="Currency" value={store.currency} />
        <Stat label="Invoice prefix" value={store.invoicePrefix} />
        <Stat label="Next invoice #" value={String(store.nextInvoiceSeq)} />

        {/* Action tiles */}
        {tiles.map((t, i) => {
          const Icon = t.icon;
          // Give every third tile extra width for bento rhythm.
          const wide = i % 3 === 2;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`group flex flex-col justify-between rounded-fizz border border-ink-line bg-ink-soft p-5 transition-all hover:-translate-y-0.5 hover:border-fizz/40 sm:p-6 ${
                wide ? "col-span-2" : ""
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-fizz border border-ink-line bg-ink text-fizz transition-colors group-hover:border-fizz/40 sm:h-11 sm:w-11">
                <Icon />
              </span>
              <div>
                <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                  {t.label}
                </h3>
                <p className="mt-1 text-xs text-steam sm:text-sm">{t.blurb}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-between rounded-fizz border border-ink-line bg-ink-soft p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
        {label}
      </p>
      <p className="truncate font-display text-xl font-bold tracking-tight text-cream sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
