"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Folder, MoreHorizontal, Settings, Trash2, Loader2 } from "lucide-react"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useListProjects, useDeleteProject } from "@/entities/project"

type ProjectItem = { id: string; slug?: string | null; name: string }

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
                    projects.map((project) => (
                        <ProjectRow
                            key={project.id}
                            organizationId={organizationId}
                            project={project as ProjectItem}
                        />
                    ))
                )}
            </SidebarMenu>
        </SidebarGroup>
    )
}

function ProjectRow({
    organizationId,
    project,
}: {
    organizationId: string
    project: ProjectItem
}) {
    const router = useRouter()
    const params = useParams()
    const projectIdentifier = project.slug || project.id
    const [confirmOpen, setConfirmOpen] = useState(false)
    const { mutate: deleteProject, isPending } = useDeleteProject(organizationId)

    // If the user is currently viewing the project being deleted, send them somewhere valid after.
    const activeProjectParam = (params?.projectId as string) ?? ""
    const isViewingThisProject =
        activeProjectParam === project.slug || activeProjectParam === project.id

    const handleDelete = () => {
        deleteProject(project.id, {
            onSuccess: () => {
                toast.success(`Deleted "${project.name}"`)
                setConfirmOpen(false)
                if (isViewingThisProject) {
                    router.push(`/${organizationId}/projects`)
                }
            },
            onError: () => {
                toast.error("Failed to delete project. Please try again.")
            },
        })
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href={`/${organizationId}/projects/${projectIdentifier}`}>
                    <Folder />
                    <span>{project.name}</span>
                </Link>
            </SidebarMenuButton>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover aria-label="Project actions">
                        <MoreHorizontal />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-48">
                    <DropdownMenuItem asChild>
                        <Link href={`/${organizationId}/projects/${projectIdentifier}/settings`}>
                            <Settings />
                            Project settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => {
                            // Keep the menu's selection from closing the dialog we're about to open.
                            e.preventDefault()
                            setConfirmOpen(true)
                        }}
                    >
                        <Trash2 />
                        Delete project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete &ldquo;{project.name}&rdquo;?</DialogTitle>
                        <DialogDescription>
                            This permanently deletes the project and all of its ingested data,
                            timeline, and reports. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                "Delete project"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarMenuItem>
    )
}
