import { ReactNode } from "react";
import { ProjectDetailShell } from "@/widgets/project-detail-shell";

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <ProjectDetailShell>{children}</ProjectDetailShell>
        </div>
    );
}