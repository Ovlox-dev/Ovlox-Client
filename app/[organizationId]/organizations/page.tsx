"use client"

import { useCallback, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { userOrgs } from "@/entities/organization/api/org"
import { buildDashboardOrgRoute, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"

import { Plus, Building2, MoreHorizontal, Search, Settings2, FileText, Copy, Link, Trash2, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

import { PageTitle } from "@/components/page-title"

const menuItems = [
    [
        { label: "Settings", icon: Settings2 },
        { label: "View Details", icon: FileText },
    ],
    [
        { label: "Copy Link", icon: Link },
        { label: "Duplicate", icon: Copy },
    ],
    [
        { label: "Leave Organization", icon: LogOut },
        { label: "Delete", icon: Trash2 },
    ],
]


export default function Organizations() {
    const router = useRouter();
    const params = useParams<{ organizationId: string }>();
    const orgId = params?.organizationId;
    const [page, setPage] = useState(1)
    const [totalPages] = useState(1)
    const [totalCount] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")


    const { data = [], isLoading, error } = useQuery({
        queryKey: ["userOrgs"],
        queryFn: () => userOrgs().then(res => res.data ?? []),
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });

    const handleSelectOrg = useCallback(
        (id: string) => {
            setActiveOrgId(id);
            router.push(buildDashboardOrgRoute(id));
        },
        [router]
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageTitle
                    title="Organizations"
                    description="Manage and access your organizations"
                />
                <Button onClick={() => router.push(`/${orgId}/organizations/new`)}>
                    <Plus className="size-4" />
                    New Organization
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-4 text-sm text-destructive">
                    Error loading organizations
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: Math.min(9, 6) }).map((_, idx) => (
                        <div
                            key={idx}
                            className="h-36 rounded-lg border border-border bg-muted/30 animate-pulse"
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map((org) => {
                        const memberCount = org.members?.length ?? 0
                        const projectCount = (org as unknown as { projects?: unknown[] })?.projects?.length ?? 0

                        return (
                            <article
                                key={org.id}
                                className="group relative border border-border rounded-lg p-6 bg-card shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden"
                                onClick={() => handleSelectOrg(org.id)}
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                <div className="relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <Avatar className="h-14 w-14 rounded-lg ring-2 ring-border group-hover:ring-primary/30 transition-all duration-200">
                                                <AvatarImage src={org.slug} alt={org.name} />
                                                <AvatarFallback className="rounded-lg text-lg font-semibold bg-linear-to-br from-primary/20 to-primary/10">
                                                    {org.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                                    {org.name}
                                                </h3>
                                            </div>
                                        </div>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 -mt-1 -mr-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-56 overflow-hidden rounded-lg p-0"
                                                align="end"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Sidebar collapsible="none" className="bg-transparent">
                                                    <SidebarContent>
                                                        {menuItems.map((group, index) => (
                                                            <SidebarGroup key={index} className="border-b last:border-none">
                                                                <SidebarGroupContent className="gap-0">
                                                                    <SidebarMenu>
                                                                        {group.map((item, idx) => (
                                                                            <SidebarMenuItem key={idx}>
                                                                                <SidebarMenuButton>
                                                                                    <item.icon className="size-4" />
                                                                                    <span>{item.label}</span>
                                                                                </SidebarMenuButton>
                                                                            </SidebarMenuItem>
                                                                        ))}
                                                                    </SidebarMenu>
                                                                </SidebarGroupContent>
                                                            </SidebarGroup>
                                                        ))}
                                                    </SidebarContent>
                                                </Sidebar>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {[...Array(Math.min(memberCount, 3))].map((_, i) => (
                                                    <Avatar key={i} className="size-6 border-2 border-card">
                                                        <AvatarFallback className="text-xs">
                                                            {String.fromCharCode(65 + i)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                                {memberCount > 3 && (
                                                    <div className="size-6 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                                                        <span className="text-xs font-medium">+{memberCount - 3}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">members</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Building2 className="size-4" />
                                            <span className="font-medium">{projectCount}</span>
                                            <span className="text-xs">projects</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {data.length} of {totalCount} organizations
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages || isLoading}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}