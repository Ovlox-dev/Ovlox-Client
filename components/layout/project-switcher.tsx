"use client"

import * as React from "react"
// import { ChevronsUpDown, Plus, FolderKanban, MessageSquare } from "lucide-react"
// import { useRouter } from "next/navigation"
// import { useProjectStore } from "@/store/project.store"
// import { useOrgStore } from "@/store/org.store"
// import { listProjects } from "@/services/project.service"
// import { IProject } from "@/types/prisma-generated"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    //  useSidebar,
} from "@/components/ui/sidebar"
import { Folder } from "lucide-react";
import Link from "next/link";

export function ProjectSwitcher({ organizationId }: { organizationId: string }) {
    // const { isMobile } = useSidebar()
    // const router = useRouter()
    // const { currentProject, setCurrentProject } = useProjectStore()
    // const { currentOrg } = useOrgStore()
    // const [projects, setProjects] = React.useState<IProject[]>([])

    // React.useEffect(() => {
    //     const fetchProjects = async () => {
    //         if (currentOrg?.id) {
    //             try {
    //                 const response = await listProjects(currentOrg.id)
    //                 setProjects(response.data || [])
    //             } catch (error) {
    //                 console.error("Failed to load projects", error)
    //             }
    //         } else {
    //             setProjects([])
    //         }
    //     }

    //     fetchProjects()
    // }, [currentOrg?.id])

    // const handleSelectProject = (project: IProject) => {
    //     setCurrentProject(project)
    //     router.push(`/projects/${project.id}`)
    // }

    // const handleNewProject = () => {
    //     router.push(`/projects/new`)
    // }

    // if (!currentOrg) {
    //     return null
    // }

    // const displayProject = currentProject || { name: "Select Project", slug: "" }
    const projectNavItems = [
        {
            title: "Project Overview",
            url: `/${organizationId}/projects/1`,

        },
        {
            title: "AI Assistant",
            url: `/${organizationId}/projects/2`,

        },
        {
            title: "Tasks",
            url: `/${organizationId}/projects/3`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
        {
            title: "Events",
            url: `/${organizationId}/projects/4`,

        },
        {
            title: "Insights",
            url: `/${organizationId}/projects/5`,

        },
        {
            title: "Analysis",
            url: `/${organizationId}/projects/6`,

        },
    ];
    return (
        <SidebarGroup className="flex min-h-0 flex-1 flex-col">
            <SidebarGroupLabel className="shrink-0">Projects</SidebarGroupLabel>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
                <SidebarMenu>
                    {projectNavItems.length === 0 ? (
                        <SidebarGroupLabel className="text-muted-foreground text-xs">
                            No projects available
                        </SidebarGroupLabel>
                    ) : (
                        projectNavItems.map((project, index) => (
                            <SidebarMenuItem key={index}>
                                <SidebarMenuButton asChild>
                                    <Link href={project.url}>
                                        <Folder className="text-muted-foreground" />
                                        <span>{project.title}</span>
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
