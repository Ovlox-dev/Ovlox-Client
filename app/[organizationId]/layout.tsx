import { AppShell } from "@/components/layout";
import { OrgAccessGate } from "@/components/layout/org-access-gate";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  return (
    <AppShell>
      <OrgAccessGate>{children}</OrgAccessGate>
    </AppShell>
  );
}
