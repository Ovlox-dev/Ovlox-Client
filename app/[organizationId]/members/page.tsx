"use client"

import React, { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { MoreVertical } from "lucide-react"

import { listInvites, listMembers } from "@/shared/api/org"
import { InviteStatus, PredefinedOrgRole } from "@/types/enum"

import { PageTitle } from "@/components/page-title"
import AddMemberModal from "@/features/add-member-modal"
import Search from "@/features/search"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/shared/ui/role-badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInitials } from "@/shared/lib/use-initials"
import { Separator } from "@/components/ui/separator"
import { dateFormatter } from "@/shared/lib/date-formatter"

const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "all", label: "All roles" },
    ...Object.values(PredefinedOrgRole).map((r) => ({
        value: r,
        label: r.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" "),
    })),
]

export default function MembersPage() {
    const params = useParams<{ organizationId: string }>()
    const organizationId = params?.organizationId ?? ""

    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<string>("all")
    const [activeTab, setActiveTab] = useState<"members" | "invites">("members")
    const [addMemberOpen, setAddMemberOpen] = useState(false)

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["orgMembers", organizationId],
        queryFn: async () => {
            const res = await listMembers(organizationId, { limit: 200 })
            return res?.data ?? []
        },
    })

    const { data: invitesData, isLoading: invitesLoading, isError: invitesIsError, error: invitesError } = useQuery({
        queryKey: ["orgInvites", organizationId],
        queryFn: async () => {
            const res = await listInvites(organizationId, { limit: 200 })
            return res?.data ?? []
        },
    })

    const pendingInvites = useMemo(() => {
        const list = invitesData ?? []
        return list.filter((i) => i.status === InviteStatus.PENDING)
    }, [invitesData])

    const filtered = useMemo(() => {
        const list = data ?? []
        const q = search.trim().toLowerCase()
        return list.filter((m) => {
            if (roleFilter !== "all" && m.predefinedRole !== roleFilter) { return false; }
            if (!q) { return true; }
            const name = (m.user?.firstName ?? "") + " " + (m.user?.lastName ?? "").toLowerCase()
            const email = (m.user?.email ?? "").toLowerCase()
            return name.includes(q) || email.includes(q)
        })
    }, [data, search, roleFilter])

    const filteredInvites = useMemo(() => {
        const q = search.trim().toLowerCase()
        return pendingInvites.filter((inv) => {
            if (roleFilter !== "all" && inv.predefinedRole !== roleFilter) { return false; }
            if (!q) { return true; }
            const email = (inv.email ?? "").toLowerCase()
            return email.includes(q)
        })
    }, [pendingInvites, search, roleFilter])

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <PageTitle
                    title="Team Members"
                    description="Manage your team and view member roles, activity, and access."
                />
                <Button
                    type="button"
                    className="bg-white font-medium text-black hover:bg-white/90"
                    onClick={() => setAddMemberOpen(true)}
                >
                    Invite members
                </Button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-md">
                    <Search
                        placeholder={
                            activeTab === "members"
                                ? "Search members"
                                : "Search invites by email"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as "members" | "invites")}
                        className="w-full sm:w-auto"
                    >
                        <TabsList className=" border border-border bg-accent-contrast p-0.5 rounded-full">
                            <TabsTrigger value="members" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:border-accent dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                Members
                            </TabsTrigger>
                            <TabsTrigger value="invites" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:border-accent dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                Invites
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLE_FILTER_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} className="w-full">
                <TabsContent value="members">
                    {isError ? (
                        <p className="text-sm text-destructive">
                            {error instanceof Error ? error.message : "Failed to load members."}
                        </p>
                    ) : null}

                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="space-y-3 rounded-xl border border-white/10 bg-[#121212] p-4"
                                >
                                    <div className="flex gap-3">
                                        <Skeleton className="size-11 shrink-0 rounded-full bg-zinc-800" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32 bg-zinc-800" />
                                            <Skeleton className="h-3 w-48 bg-zinc-800" />
                                            <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-16 w-full bg-zinc-800" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-text flex justify-center items-center">
                            {(data ?? []).length === 0
                                ? "No members in this organization yet."
                                : "No members match your search or filter."}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filtered.map((member) => (
                                <div key={member.id} className=" space-y-2 flex h-full flex-col rounded-xl border border-white/10 bg-[#121212] p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <Avatar className="size-11 shrink-0 border border-white/10">
                                                <AvatarImage src={member.user?.avatarUrl ?? undefined} alt="" />
                                                <AvatarFallback className="bg-accent/80 text-sm text-accent-contrast font-semibold">
                                                    {getInitials(`${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-0.5">
                                                <p className="truncate font-semibold text-xl text-[#F2F3F4] capitalize">{member.user?.firstName} {member.user?.lastName ?? ""}</p>
                                                <p className="truncate text-sm text-[#79868C]">{member.user?.email ?? "-"}</p>
                                                <RoleBadge
                                                    role={member.predefinedRole}
                                                    className=" rounded-full"
                                                />
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="size-8 shrink-0 text-zinc-400 hover:bg-white/10 hover:text-white"
                                                >
                                                    <MoreVertical className="size-4" />
                                                    <span className="sr-only">Member actions</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="min-w-40">
                                                <DropdownMenuItem>View profile</DropdownMenuItem>
                                                <DropdownMenuItem>Change role</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem variant="destructive">Remove from org</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <Separator />
                                    <div className="flex items-end justify-between">
                                        <p className="text-sm text-[#79868C]">Involved in
                                            <span className="text-accent"> {member.projects?.length ?? 0}</span>
                                            <span className="text-xs text-[#FFFFFF]"> projects</span>
                                        </p>
                                        <p className="text-sm text-[#55C6F0]">{member.contributions ?? 0} <span className="text-xs text-[#FFFFFF]">contributions</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="invites" className="space-y-4">
                    {invitesIsError ? (
                        <p className="text-sm text-destructive">
                            {invitesError instanceof Error ? invitesError.message : "Failed to load invites."}
                        </p>
                    ) : null}

                    {invitesLoading ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121212] p-4"
                                >
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-56 bg-zinc-800" />
                                        <Skeleton className="h-3 w-28 bg-zinc-800" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-md bg-zinc-800" />
                                </div>
                            ))}
                        </div>
                    ) : pendingInvites.length === 0 ? (
                        <p className="text-sm text-zinc-500">No pending invites.</p>
                    ) : filteredInvites.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                            No invites match your search or filter.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            {filteredInvites.map((inv) => (
                                <div
                                    key={inv.id}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#121212] p-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">
                                            {inv.email ?? "Invite"}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            Expires At: {dateFormatter(inv.expiresAt)}
                                        </p>
                                    </div>
                                    <RoleBadge role={inv.predefinedRole} className="rounded-full" />
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <AddMemberModal
                open={addMemberOpen}
                onOpenChange={setAddMemberOpen}
                organizationId={organizationId}
            />
        </div>
    )
}
