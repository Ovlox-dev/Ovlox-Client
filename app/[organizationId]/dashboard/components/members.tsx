"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { listInvites } from '@/shared/api/org';
import { useParams } from 'next/navigation';
import AddMemberModal from './add-member-modal';

type MemberRole = "developer" | "admin" | "viewer";

const MEMBERS: { name: string; role: MemberRole; org: string; contributions: number }[] = [
    { name: "Rishi Paul", role: "developer", org: "ovlox.dev", contributions: 14 },
    { name: "Alex Butcher", role: "admin", org: "Apex Constructions", contributions: 12 },
    { name: "Priya Dey", role: "admin", org: "notion.com", contributions: 8 },
    { name: "Sam Wilson", role: "developer", org: "TechCorp", contributions: 22 },
    { name: "Jordan Lee", role: "admin", org: "BuildCo", contributions: 6 },
    { name: "Morgan Blake", role: "viewer", org: "Design Studio", contributions: 19 },
    { name: "Casey Kim", role: "admin", org: "StartupXYZ", contributions: 11 },
];

const MEMBERS_PER_PAGE = 3;
const ROLE_OPTIONS: { value: "all" | MemberRole; label: string }[] = [
    { value: "all", label: "All" },
    { value: "developer", label: "Developer" },
    { value: "admin", label: "Admin" },
    { value: "viewer", label: "Viewer" },
];

const Members = () => {
    const [memberPage, setMemberPage] = useState(0);
    const [roleFilter, setRoleFilter] = useState<"all" | MemberRole>("all");
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? "";

    const filteredMembers =
        roleFilter === "all"
            ? MEMBERS
            : MEMBERS.filter((m) => m.role === roleFilter);

    const memberPageCount = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);


    const handleRoleFilterChange = (value: "all" | MemberRole) => {
        setRoleFilter(value);
        setMemberPage(0);
    };

    const safeMemberPage = Math.min(memberPage, Math.max(0, memberPageCount - 1));
    const safeVisibleMembers = filteredMembers.slice(
        safeMemberPage * MEMBERS_PER_PAGE,
        safeMemberPage * MEMBERS_PER_PAGE + MEMBERS_PER_PAGE
    );

    // integrate listMembers api
    useEffect(()=>{
        void (async () => {
            try {
                const response = await listInvites(organizationId);
                console.log(response);
            } catch (error) {
                console.error(error);
            }
        })();
    })

    return (
        <div>
            <Card className="rounded-2xl border-border bg-card">
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-base font-semibold text-muted">Members</p>
                            <span className="text-4xl font-semibold text-text-accent">
                                {filteredMembers.length} <span className="text-base font-medium text-muted">/ {MEMBERS.length}</span>
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
                                    onValueChange={(v) => handleRoleFilterChange(v as "all" | MemberRole)}
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
                        {safeVisibleMembers.length === 0 ? (
                            <li className="py-6 text-center text-sm text-muted">
                                No members with this role
                            </li>
                        ) : (
                            safeVisibleMembers.map((member, i) => (
                                <li
                                    key={safeMemberPage * MEMBERS_PER_PAGE + i}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar className="size-8 shrink-0 border border-border">
                                            <AvatarFallback className="bg-muted text-xs font-medium">
                                                {member.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-text">
                                                {member.name}
                                            </p>
                                            <p className="truncate text-xs font-normal text-muted">
                                                {member.org}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg text-text text-semibold">
                                            {member.contributions}
                                        </p>
                                        <p className="text-xs font-normal text-muted"> contributions</p>
                                    </div>
                                </li>
                            ))
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