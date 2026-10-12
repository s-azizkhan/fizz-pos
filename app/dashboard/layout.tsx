import { getCurrentUser } from "@/lib/auth/dal";
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
  const on = (k: Parameters<typeof featureOn>[1]) => featureOn(store.disabledFeatures, k);
  return (
    <DashboardShell user={{ name: user.name, role: user.role }} off={store.disabledFeatures}>
      {on("printers") && <TicketLayoutSync initial={store.ticketLayouts ?? {}} />}
      <PrinterKeepAlive on={on("printers")} />
      {on("publicMenu") && <WebOrderAlarm kot={on("kot")} />}
      {children}
    </DashboardShell>
  );
}
