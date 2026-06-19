"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { MoreVertical, Mail, Plus, FolderGit2, Sparkles, ArrowRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { listInvites, listMembers } from "@/entities/organization/api/org"
import { useOrgMemberStats } from "@/entities/organization"
import { useUpdateOrgMember, useRemoveOrgMember } from "@/shared/queries/org.queries"
import { InviteStatus, PredefinedOrgRole } from "@/types/enum"
import type { IOrganizationMember } from "@/types/prisma-generated"

import { PageTitle } from "@/components/page-title"
import AddMemberModal from "@/features/add-member-modal/ui/add-member-modal"
import Search from "@/features/search"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/shared/ui/role-badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
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
import { dateFormatter } from "@/shared/lib/date-formatter"

const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "all", label: "All roles" },
    ...Object.values(PredefinedOrgRole).map((r) => ({
        value: r,
        label: r
            .split("_")
            .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
            .join(" "),
    })),
]

export default function MembersPage() {
    const params = useParams<{ organizationId: string }>()
    const organizationId = params?.organizationId ?? ""

    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<string>("all")
    const [activeTab, setActiveTab] = useState<"members" | "invites">("members")
    const [addMemberOpen, setAddMemberOpen] = useState(false)

    const {
        data,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["orgMembers", organizationId],
        queryFn: async () => {
            const res = await listMembers(organizationId, { limit: 200 })
            return res?.data ?? []
        },
        enabled: !!organizationId,
    })

    const {
        data: invitesData,
        isLoading: invitesLoading,
        isError: invitesIsError,
        error: invitesError,
    } = useQuery({
        queryKey: ["orgInvites", organizationId],
        queryFn: async () => {
            const res = await listInvites(organizationId, { limit: 200 })
            return res?.data ?? []
        },
        enabled: !!organizationId,
    })

    // Per-member stats (projects involved + total contributions) aggregated
    // from the per-project /contributions endpoint, since listMembers doesn't
    // include them.
    const { stats: memberStats, isLoading: statsLoading } =
        useOrgMemberStats(organizationId)

    const pendingInvites = useMemo(() => {
        const list = invitesData ?? []
        return list.filter((i) => i.status === InviteStatus.PENDING)
    }, [invitesData])

    const filtered = useMemo(() => {
        const list = data ?? []
        const q = search.trim().toLowerCase()
        return list.filter((m) => {
            if (roleFilter !== "all" && m.predefinedRole !== roleFilter) return false
            if (!q) return true
            const name = `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""}`.toLowerCase()
            const email = (m.user?.email ?? "").toLowerCase()
            return name.includes(q) || email.includes(q)
        })
    }, [data, search, roleFilter])

    const filteredInvites = useMemo(() => {
        const q = search.trim().toLowerCase()
        return pendingInvites.filter((inv) => {
            if (roleFilter !== "all" && inv.predefinedRole !== roleFilter) return false
            if (!q) return true
            return (inv.email ?? "").toLowerCase().includes(q)
        })
    }, [pendingInvites, search, roleFilter])

    const totalMembers = data?.length ?? 0
    const totalInvites = pendingInvites.length

    return (
        <div className="space-y-7">
            {/* HEADER */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <PageTitle
                    title="Team Members"
                    description="Manage your team and view member roles, activity, and access."
                />
                <Button
                    type="button"
                    onClick={() => setAddMemberOpen(true)}
                    className="self-start"
                >
                    <Plus className="size-4" />
                    Invite members
                </Button>
            </div>

            {/* COUNTERS + FILTERS */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-md">
                    <Search
                        placeholder={
                            activeTab === "members"
                                ? "Search by name or email"
                                : "Search invites by email"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as "members" | "invites")}
                    >
                        <TabsList>
                            <TabsTrigger value="members" className="gap-2">
                                Members
                                <span className="rounded-md px-1.5 py-px text-[10px] font-mono bg-(--bg-3) border border-(--line-2)">
                                    {totalMembers}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="invites" className="gap-2">
                                Invites
                                <span className="rounded-md px-1.5 py-px text-[10px] font-mono bg-(--bg-3) border border-(--line-2)">
                                    {totalInvites}
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger size="default" className="min-w-[140px]">
                            <SelectValue placeholder="Filter by role" />
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
                {/* MEMBERS */}
                <TabsContent value="members" className="mt-0">
                    {isError ? (
                        <ErrorState
                            message={
                                error instanceof Error
                                    ? error.message
                                    : "Failed to load members."
                            }
                        />
                    ) : isLoading ? (
                        <CardGrid>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <MemberSkeleton key={i} />
                            ))}
                        </CardGrid>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={<Sparkles className="size-5 text-(--accent-lime)" />}
                            title={
                                (data ?? []).length === 0
                                    ? "No members yet"
                                    : "No matches"
                            }
                            body={
                                (data ?? []).length === 0
                                    ? "Invite your first teammate to start collaborating."
                                    : "Try a different search or role filter."
                            }
                        />
                    ) : (
                        <CardGrid>
                            {filtered.map((member) => {
                                const fullName =
                                    `${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`.trim() ||
                                    member.user?.email ||
                                    "Unknown"
                                const initials = getInitials(fullName)
                                // Prefer aggregated stats from /contributions
                                // endpoint; fall back to whatever the member
                                // payload happens to carry.
                                const aggStats = memberStats[member.id]
                                const projectCount =
                                    aggStats?.projectCount ??
                                    member.projects?.length ??
                                    0
                                const contributions =
                                    aggStats?.contributions ??
                                    member.contributions ??
                                    0
                                return (
                                    <article
                                        key={member.id}
                                        className="group flex h-full flex-col rounded-[14px] border border-(--line) bg-(--bg-2) p-5 transition-colors hover:border-(--accent-lime)/30"
                                    >
                                        {/* TOP ROW: avatar + identity + actions */}
                                        <div className="flex items-start gap-3 min-w-0">
                                            <Avatar className="size-11 shrink-0 border border-(--line-2) rounded-[10px]">
                                                <AvatarImage
                                                    src={member.user?.avatarUrl ?? undefined}
                                                    alt={fullName}
                                                />
                                                <AvatarFallback className="rounded-[10px] bg-(--bg-3) text-(--accent-lime) font-semibold text-sm">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate font-semibold text-base text-(--fg) capitalize">
                                                    {fullName}
                                                </p>
                                                <p className="truncate text-xs text-(--fg-3) flex items-center gap-1.5 mt-0.5">
                                                    <Mail className="size-3 shrink-0" />
                                                    <span className="truncate">
                                                        {member.user?.email ?? "—"}
                                                    </span>
                                                </p>
                                            </div>
                                            <MemberActions
                                                organizationId={organizationId}
                                                member={member}
                                                fullName={fullName}
                                            />
                                        </div>

                                        {/* ROLE */}
                                        <div className="mt-3">
                                            <RoleBadge role={member.predefinedRole} />
                                        </div>

                                        {/* DIVIDER */}
                                        <div className="my-4 h-px bg-(--line-2)" />

                                        {/* STATS ROW */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                                    <FolderGit2 className="size-3" />
                                                    Projects
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-(--fg) tabular-nums">
                                                    {statsLoading && !aggStats ? (
                                                        <span className="inline-block size-4 align-middle rounded bg-(--bg-3) animate-pulse" />
                                                    ) : (
                                                        projectCount
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                                    <Sparkles className="size-3" />
                                                    Contributions
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-(--accent-lime) tabular-nums">
                                                    {statsLoading && !aggStats ? (
                                                        <span className="inline-block size-4 align-middle rounded bg-(--bg-3) animate-pulse" />
                                                    ) : (
                                                        contributions
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* VIEW PROFILE LINK */}
                                        <Link
                                            href={`/${organizationId}/members/${member.id}`}
                                            className="mt-4 inline-flex items-center justify-between gap-1.5 text-xs font-mono uppercase tracking-wider text-(--fg-3) hover:text-(--accent-lime) transition-colors group/link"
                                        >
                                            <span>View profile · contributions · identities</span>
                                            <ArrowRight className="size-3 transition-transform group-hover/link:translate-x-0.5" />
                                        </Link>
                                    </article>
                                )
                            })}
                        </CardGrid>
                    )}
                </TabsContent>

                {/* INVITES */}
                <TabsContent value="invites" className="mt-0">
                    {invitesIsError ? (
                        <ErrorState
                            message={
                                invitesError instanceof Error
                                    ? invitesError.message
                                    : "Failed to load invites."
                            }
                        />
                    ) : invitesLoading ? (
                        <CardGrid>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <InviteSkeleton key={i} />
                            ))}
                        </CardGrid>
                    ) : pendingInvites.length === 0 ? (
                        <EmptyState
                            icon={<Mail className="size-5 text-(--accent-lime)" />}
                            title="No pending invites"
                            body="Once you invite someone, they'll show up here until they accept."
                        />
                    ) : filteredInvites.length === 0 ? (
                        <EmptyState
                            icon={<Mail className="size-5 text-(--accent-lime)" />}
                            title="No matches"
                            body="No invites match your search or filter."
                        />
                    ) : (
                        <CardGrid>
                            {filteredInvites.map((inv) => (
                                <article
                                    key={inv.id}
                                    className="group flex flex-col gap-3 rounded-[14px] border border-(--line) bg-(--bg-2) p-5 transition-colors hover:border-(--accent-lime)/30"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="size-10 shrink-0 rounded-[10px] border border-(--line-2) bg-(--bg-3) grid place-items-center text-(--accent-lime)">
                                            <Mail className="size-4" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium text-(--fg) text-sm">
                                                {inv.email ?? "Invite"}
                                            </p>
                                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                                Expires {dateFormatter(inv.expiresAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <RoleBadge role={inv.predefinedRole} />
                                </article>
                            ))}
                        </CardGrid>
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

const ASSIGNABLE_ROLES: Array<{ value: PredefinedOrgRole; label: string }> =
    Object.values(PredefinedOrgRole).map((r) => ({
        value: r,
        label: r
            .split("_")
            .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
            .join(" "),
    }))

function MemberActions({
    organizationId,
    member,
    fullName,
}: {
    organizationId: string
    member: IOrganizationMember
    fullName: string
}) {
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
    const updateMember = useUpdateOrgMember(organizationId)
    const removeMember = useRemoveOrgMember(organizationId)

    const handleRoleChange = (role: PredefinedOrgRole) => {
        if (role === member.predefinedRole) { return }
        updateMember.mutate(
            { memberId: member.id, data: { predefinedRole: role } },
            {
                onSuccess: () => toast.success(`${fullName} is now ${role.toLowerCase()}`),
                onError: (err) =>
                    toast.error("Couldn't change role", {
                        description: err instanceof Error ? err.message : undefined,
                    }),
            },
        )
    }

    const handleRemove = () => {
        removeMember.mutate(member.id, {
            onSuccess: () => {
                toast.success(`${fullName} removed from organization`)
                setConfirmRemoveOpen(false)
            },
            onError: (err) =>
                toast.error("Couldn't remove member", {
                    description: err instanceof Error ? err.message : undefined,
                }),
        })
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0"
                    >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Member actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem asChild>
                        <Link href={`/${organizationId}/members/${member.id}`}>
                            View profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger disabled={updateMember.isPending}>
                            Change role
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {ASSIGNABLE_ROLES.map((role) => (
                                <DropdownMenuItem
                                    key={role.value}
                                    onSelect={() => handleRoleChange(role.value)}
                                    disabled={updateMember.isPending}
                                >
                                    {role.value === member.predefinedRole ? (
                                        <Check className="size-4 text-(--accent-lime)" />
                                    ) : (
                                        <span className="size-4" />
                                    )}
                                    {role.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => {
                            e.preventDefault()
                            setConfirmRemoveOpen(true)
                        }}
                    >
                        Remove from org
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove {fullName}?</DialogTitle>
                        <DialogDescription>
                            They will lose access to this organization and all of its
                            projects. This can&apos;t be undone, but they can be re-invited.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmRemoveOpen(false)}
                            disabled={removeMember.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleRemove}
                            disabled={removeMember.isPending}
                        >
                            {removeMember.isPending ? (
                                <>
                                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                                    Removing…
                                </>
                            ) : (
                                "Remove member"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function CardGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children}
        </div>
    )
}

function MemberSkeleton() {
    return (
        <div className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5 space-y-4">
            <div className="flex gap-3">
                <Skeleton className="size-11 shrink-0 rounded-[10px] bg-(--bg-3)" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-(--bg-3)" />
                    <Skeleton className="h-3 w-40 bg-(--bg-3)" />
                </div>
            </div>
            <Skeleton className="h-4 w-20 bg-(--bg-3) rounded-full" />
            <div className="h-px bg-(--line-2)" />
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 bg-(--bg-3)" />
                <Skeleton className="h-10 bg-(--bg-3)" />
            </div>
        </div>
    )
}

function InviteSkeleton() {
    return (
        <div className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5 space-y-3">
            <div className="flex gap-3">
                <Skeleton className="size-10 shrink-0 rounded-[10px] bg-(--bg-3)" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-44 bg-(--bg-3)" />
                    <Skeleton className="h-3 w-28 bg-(--bg-3)" />
                </div>
            </div>
            <Skeleton className="h-4 w-20 bg-(--bg-3) rounded-full" />
        </div>
    )
}

function EmptyState({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode
    title: string
    body: string
}) {
    return (
        <div className="rounded-[14px] border border-dashed border-(--line) bg-(--bg-2)/50 py-14 px-6 text-center">
            <div className="inline-grid size-12 place-items-center rounded-full bg-(--bg-3) border border-(--line-2) mb-4">
                {icon}
            </div>
            <p className="text-(--fg) font-medium">{title}</p>
            <p className="text-(--fg-3) text-sm mt-1 max-w-sm mx-auto">{body}</p>
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-[14px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-5 text-center">
            <p className="text-(--danger) text-sm font-medium">{message}</p>
        </div>
    )
}
