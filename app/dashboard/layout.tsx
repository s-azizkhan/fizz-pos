import { getCurrentUser } from "@/lib/auth/dal";
import DashboardShell from "@/components/fizz/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <DashboardShell user={{ name: user.name, role: user.role }}>
      {children}
    </DashboardShell>
  );
}
