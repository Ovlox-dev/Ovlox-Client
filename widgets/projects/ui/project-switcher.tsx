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
        <SidebarGroup className="flex min-h-0 flex-1 flex-col">
            <SidebarGroupLabel className="shrink-0">Projects</SidebarGroupLabel>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
                <SidebarMenu>
                    {isLoading ? (
                        <SidebarGroupLabel className="text-muted-foreground text-xs">
                            Loading projects...
                        </SidebarGroupLabel>
                    ) : projects.length === 0 ? (
                        <SidebarGroupLabel className="text-muted-foreground text-xs">
                            No projects available
                        </SidebarGroupLabel>
                    ) : (
                        projects.map((project) => (
                            <SidebarMenuItem key={project.id}>
                                <SidebarMenuButton asChild>
                                    <Link href={`/${organizationId}/projects/${project.id}`}>
                                        <Folder className="text-muted-foreground" />
                                        <span>{project.name}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))
                    )}
                </SidebarMenu>
            </div>
        </SidebarGroup>
    )
}

