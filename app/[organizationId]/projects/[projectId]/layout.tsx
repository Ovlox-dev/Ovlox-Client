import { ReactNode } from "react";
import { ProjectDetailShell } from "@/widgets/project-detail-shell";

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
    return <ProjectDetailShell>{children}</ProjectDetailShell>;
}
