"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, UserPlus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useListProjectMembers,
    useAddProjectMember,
    useRemoveProjectMember,
    useUpdateProjectMemberRole,
    useSyncProjectMembers,
} from "@/entities/project";
import { useListOrgMembers } from "@/shared/queries/org.queries";
import { PredefinedOrgRole } from "@/types/enum";
import { getInitials } from "@/shared/lib/use-initials";

// OWNER is org-level and not assignable per-project; everything else can be set on a project member.
const ASSIGNABLE_ROLES: PredefinedOrgRole[] = [
    PredefinedOrgRole.ADMIN,
    PredefinedOrgRole.DEVELOPER,
    PredefinedOrgRole.VIEWER,
    PredefinedOrgRole.CEO,
    PredefinedOrgRole.CTO,
];

type MemberUser = { firstName?: string | null; lastName?: string | null; email?: string | null };

function displayName(user?: MemberUser | null): string {
    const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return full || user?.email || "Unknown user";
}

export function ProjectMembersSettings() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const { data: members, isLoading } = useListProjectMembers(organizationId, projectId);
    const { data: orgMembersResp } = useListOrgMembers(organizationId, { limit: 200 });

    const addMember = useAddProjectMember(organizationId, projectId);
    const removeMember = useRemoveProjectMember(organizationId, projectId);
    const updateRole = useUpdateProjectMemberRole(organizationId, projectId);
    const syncMembers = useSyncProjectMembers(organizationId, projectId);

    const projectMembers = members ?? [];
    const memberUserIds = new Set(projectMembers.map((m) => m.userId));
    const orgMembers = orgMembersResp?.data ?? [];
    const addable = orgMembers.filter(
        (m) => m.userId && !memberUserIds.has(m.userId) && m.predefinedRole !== PredefinedOrgRole.OWNER,
    );

    const [selectedUserId, setSelectedUserId] = React.useState("");
    const [selectedRole, setSelectedRole] = React.useState<PredefinedOrgRole>(PredefinedOrgRole.DEVELOPER);

    const handleAdd = () => {
        if (!selectedUserId) { return; }
        addMember.mutate(
            { userId: selectedUserId, predefinedRole: selectedRole },
            {
                onSuccess: () => {
                    toast.success("Member added to project");
                    setSelectedUserId("");
                },
                onError: () => toast.error("Failed to add member"),
            },
        );
    };

    const handleRoleChange = (memberId: string, role: PredefinedOrgRole) => {
        updateRole.mutate(
            { memberId, data: { predefinedRole: role } },
            {
                onSuccess: () => toast.success("Role updated"),
                onError: () => toast.error("Failed to update role"),
            },
        );
    };

    const handleRemove = (memberId: string, name: string) => {
        removeMember.mutate(memberId, {
            onSuccess: () => toast.success(`Removed ${name}`),
            onError: () => toast.error("Failed to remove member"),
        });
    };

    return (
        <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Members</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Control who can access this project and their role.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        syncMembers.mutate(undefined, {
                            onSuccess: () => toast.success("Synced members from organization"),
                            onError: () => toast.error("Sync failed"),
                        })
                    }
                    disabled={syncMembers.isPending}
                >
                    {syncMembers.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <RefreshCw className="size-4" />
                    )}
                    Sync from org
                </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full sm:w-64">
                        <SelectValue placeholder={addable.length ? "Add a member…" : "All org members added"} />
                    </SelectTrigger>
                    <SelectContent>
                        {addable.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                                {displayName(m.user)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PredefinedOrgRole)}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                                {r}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={!selectedUserId || addMember.isPending}>
                    {addMember.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <UserPlus className="size-4" />
                    )}
                    Add
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            ) : projectMembers.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                    No members yet. Add one above or sync from the organization.
                </p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {projectMembers.map((m) => {
                        const name = displayName(m.user);
                        const isOwner = m.predefinedRole === PredefinedOrgRole.OWNER;
                        const role = (m.predefinedRole as PredefinedOrgRole) ?? PredefinedOrgRole.VIEWER;
                        return (
                            <li key={m.id} className="flex items-center gap-3 p-3">
                                <Avatar className="size-8">
                                    <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-text">{name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{m.user?.email}</p>
                                </div>
                                {isOwner ? (
                                    <span className="px-2 text-xs font-medium text-muted-foreground">Owner</span>
                                ) : (
                                    <>
                                        <Select
                                            value={role}
                                            onValueChange={(v) => handleRoleChange(m.id, v as PredefinedOrgRole)}
                                        >
                                            <SelectTrigger className="h-8 w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSIGNABLE_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>
                                                        {r}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={`Remove ${name}`}
                                            onClick={() => handleRemove(m.id, name)}
                                            disabled={removeMember.isPending}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
