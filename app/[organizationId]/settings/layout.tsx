import { ReactNode } from "react";
import { OrgSettingsShell } from "@/widgets/org-settings-page";

export default function OrgSettingsLayout({ children }: { children: ReactNode }) {
    return <OrgSettingsShell>{children}</OrgSettingsShell>;
}
