"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { listInvites, listMembers } from '@/shared/api/org';
import type { IInvite, IOrganizationMember } from '@/types/prisma-generated';
import { useParams } from 'next/navigation';
import AddMemberModal from '@/features/add-member-modal';
import { useQuery } from '@tanstack/react-query';
import { InviteStatus } from '@/types/enum';
import { dateFormatter } from '@/shared/lib/date-formatter';
import { RoleBadge } from '@/shared/ui/role-badge';
import { getInitials } from '@/shared/lib/use-initials';

const MEMBERS_PER_PAGE = 3;

function isExpiredBeforeToday(isoDate: string): boolean {
    const expiry = new Date(isoDate)
    if (Number.isNaN(expiry.getTime())) return false
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfExpiry = new Date(
        expiry.getFullYear(),
        expiry.getMonth(),
        expiry.getDate(),
    )
    return startOfExpiry < startOfToday
}

const ROLE_OPTIONS: { value: "members" | "invites"; label: string }[] = [
    { value: "members", label: "Members" },
    { value: "invites", label: "Invites" },
];

const Members = () => {
    const [memberPage, setMemberPage] = useState(0);
    const [roleFilter, setRoleFilter] = useState<"members" | "invites">("members");
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? "";

    const { data: membersData } = useQuery<IOrganizationMember[]>({
        queryKey: ["orgMembers", organizationId],
        queryFn: async () => {
            const res = await listMembers(organizationId, { limit: 200 })
            return res?.data ?? []
        },
    })

    const { data: invitesData } = useQuery<IInvite[]>({
        queryKey: ["orgInvites", organizationId],
        queryFn: async () => {
            const res = await listInvites(organizationId, { limit: 200 })
            return res?.data ?? []
        },
    })

    const pendingInvites = useMemo(
        () => (invitesData ?? []).filter((inv) => inv.status === InviteStatus.PENDING),
        [invitesData],
    )


    const handleRoleFilterChange = (value: "members" | "invites") => {
        setRoleFilter(value);
        setMemberPage(0);
    };

    const sourceData =
        roleFilter === "members" ? (membersData ?? []) : pendingInvites

    const memberPageCount = Math.max(
        1,
        Math.ceil(sourceData.length / MEMBERS_PER_PAGE),
    )

    const safeMemberPage = Math.min(memberPage, Math.max(0, memberPageCount - 1));

    const safeVisibleItems = sourceData.slice(
        safeMemberPage * MEMBERS_PER_PAGE,
        safeMemberPage * MEMBERS_PER_PAGE + MEMBERS_PER_PAGE,
    );


    return (
        <div>
            <Card className="rounded-2xl border-border bg-card min-h-full">
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-base font-semibold text-muted">Members</p>
                            <span className="text-4xl font-semibold text-text-accent">
                                {roleFilter === "members"
                                    ? (membersData?.length ?? 0)
                                    : pendingInvites.length}
                                <span className="ml-1 text-base font-medium text-muted">
                                    {roleFilter === "members" ? "active" : "pending"}
                                </span>
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="bg-accent-contrast rounded-full text-muted border-[0.5px] border-border  "
                                onClick={() => setAddMemberOpen(true)}
                            >
                                <Plus />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={roleFilter}
                                    onValueChange={(v) => handleRoleFilterChange(v as "members" | "invites")}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="text-xs text-text rounded-full bg-accent-contrast border-[0.5px] border-border px-2 py-1"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <ul className="space-y-2">
                        {safeVisibleItems.length === 0 ? (
                            <li className="py-6 text-center text-sm text-muted">
                                {roleFilter === "members"
                                    ? "No members found."
                                    : "No pending invites."}
                            </li>
                        ) : (
                            safeVisibleItems.map((item, i) => {
                                const isMember = roleFilter === "members"
                                const member = item as IOrganizationMember
                                const invite = item as IInvite

                                const memberInitials = getInitials(`${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`)
                                const inviteInitial = getInitials(invite.email ?? "N/A")

                                return (
                                    <li
                                        key={safeMemberPage * MEMBERS_PER_PAGE + i}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar className="size-8 shrink-0 border border-border">
                                                <AvatarFallback className="bg-muted text-xs font-medium uppercase">
                                                    {isMember ? memberInitials || inviteInitial : inviteInitial}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                {isMember ? (
                                                    <>
                                                        <p className="truncate capitalize font-medium text-text">
                                                            {member.user?.firstName} {member.user?.lastName}
                                                        </p>
                                                        <p className="truncate text-xs font-normal text-muted">{member.user.email}</p>
                                                    </>
                                                ) : (<>
                                                    <p className="truncate font-medium text-text">
                                                        {invite.email}
                                                    </p>
                                                    <RoleBadge role={invite.predefinedRole} className="rounded-full" />
                                                </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {isMember ? (
                                                <>
                                                    <p className="text-lg text-text text-semibold">
                                                        {member.contributions ?? 0}
                                                    </p>
                                                    <p className="text-xs font-normal text-muted">
                                                        contributions
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-normal text-muted">
                                                        {isExpiredBeforeToday(invite.expiresAt)
                                                            ? "Expired at"
                                                            : "Expires at"}
                                                    </p>
                                                    <p className="text-lg text-text text-semibold">
                                                        {dateFormatter(invite.expiresAt)}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                    {memberPageCount > 1 && (
                        <div className="flex justify-center items-center gap-2">
                            <div
                                className="cursor-pointer"
                                onClick={() => safeMemberPage > 0 && setMemberPage(safeMemberPage - 1)}
                            >
                                <ChevronLeft className="size-5" />
                            </div>
                            {Array.from({ length: memberPageCount }).map((_, d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setMemberPage(d)}
                                    aria-label={`Go to members page ${d + 1}`}
                                    className={cn(
                                        "size-1.5 rounded-full transition-colors",
                                        d === safeMemberPage
                                            ? "bg-accent"
                                            : "bg-muted hover:bg-accent"
                                    )}
                                />
                            ))}
                            <div
                                className="cursor-pointer"
                                onClick={() => safeMemberPage < memberPageCount - 1 && setMemberPage(safeMemberPage + 1)}
                            >
                                <ChevronRight className="size-5" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AddMemberModal
                open={addMemberOpen}
                onOpenChange={setAddMemberOpen}
                organizationId={organizationId}
                onInvited={() => {
                    // placeholder for refresh once members/invites list is wired in
                }}
            />
        </div>
    )
}

export default Members