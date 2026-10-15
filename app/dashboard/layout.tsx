import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { getStore } from "@/lib/store/data";
import { featureOn } from "@/lib/store/features";
import DashboardShell from "@/components/fizz/dashboard/DashboardShell";
import TicketLayoutSync from "@/components/fizz/printers/TicketLayoutSync";
import PrinterKeepAlive from "@/components/fizz/printers/PrinterKeepAlive";
import WebOrderAlarm from "@/components/fizz/orders/WebOrderAlarm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, store] = await Promise.all([getCurrentUser(), getStore()]);
  // A fresh counter: the owner sets it up before anyone runs the floor.
  if (user.role === "admin" && !store.onboardedAt) redirect("/onboarding");
  const on = (k: Parameters<typeof featureOn>[1]) => featureOn(store.disabledFeatures, k);
  return (
    <DashboardShell user={{ name: user.name, role: user.role, platform: isPlatformAdmin(user.email) }} off={store.disabledFeatures}>
      {on("printers") && <TicketLayoutSync initial={store.ticketLayouts ?? {}} />}
      <PrinterKeepAlive on={on("printers")} />
      {on("publicMenu") && <WebOrderAlarm kot={on("kot")} />}
      {children}
    </DashboardShell>
  );
}
