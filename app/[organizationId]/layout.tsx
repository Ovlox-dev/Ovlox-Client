import { AppShell } from "@/components/layout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
