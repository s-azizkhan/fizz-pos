import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import DashboardShell from "@/components/fizz/dashboard/DashboardShell";
import TicketLayoutSync from "@/components/fizz/printers/TicketLayoutSync";
import PrinterKeepAlive from "@/components/fizz/printers/PrinterKeepAlive";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, store] = await Promise.all([getCurrentUser(), getStore()]);
  return (
    <DashboardShell user={{ name: user.name, role: user.role }}>
      <TicketLayoutSync initial={store.ticketLayouts ?? {}} />
      <PrinterKeepAlive />
      {children}
    </DashboardShell>
  );
}
