"use client"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Folder } from "lucide-react"
import Link from "next/link"
import { useListProjects } from "@/entities/project"

export function ProjectSwitcher({ organizationId }: { organizationId: string }) {
    const { data: projectsResponse, isLoading } = useListProjects(organizationId)
    const projects = projectsResponse?.data ?? []

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarMenu>
                {isLoading ? (
                    <SidebarGroupLabel className="text-(--fg-3) text-xs">
                        Loading projects...
                    </SidebarGroupLabel>
                ) : projects.length === 0 ? (
                    <SidebarGroupLabel className="text-(--fg-3) text-xs">
                        No projects available
                    </SidebarGroupLabel>
                ) : (
                    projects.map((project) => {
                        const projectIdentifier = project.slug || project.id;
                        return (
                            <SidebarMenuItem key={project.id}>
                                <SidebarMenuButton asChild>
                                    <Link href={`/${organizationId}/projects/${projectIdentifier}`}>
                                        <Folder />
                                        <span>{project.name}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })
                )}
            </SidebarMenu>
        </SidebarGroup>
    )
}

