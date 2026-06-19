"use client"

import * as React from "react"
import { ArrowLeft, ChevronRight, Plus, Search, X } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    useAddProjectMember,
    useListProjectMembers,
    useRemoveProjectMember,
} from "@/entities/project"
import { useListOrgMembers } from "@/shared/queries/org.queries"
import { PredefinedOrgRole } from "@/types/enum"

const ROLE_OPTIONS: Array<{ value: PredefinedOrgRole; label: string }> = [
    { value: PredefinedOrgRole.OWNER, label: "Owner" },
    { value: PredefinedOrgRole.ADMIN, label: "Admin" },
    { value: PredefinedOrgRole.DEVELOPER, label: "Developer" },
    { value: PredefinedOrgRole.VIEWER, label: "Viewer" },
    { value: PredefinedOrgRole.CEO, label: "CEO" },
    { value: PredefinedOrgRole.CTO, label: "CTO" },
]

const EMPTY_SELECTED: Record<string, boolean> = {}
const EMPTY_ROLE_BY_USER_ID: Record<string, PredefinedOrgRole> = {}

export function AddMembersStep({
    organizationId,
    projectId,
    onNext,
    onBack,
}: {
    organizationId: string
    projectId: string
    onNext: () => void
    onBack: () => void
}) {
    const [search, setSearch] = React.useState("")

    const {
        data: orgMembersResponse,
        isLoading: orgMembersLoading,
        error: orgMembersError,
    } = useListOrgMembers(organizationId, {
        search: search || undefined,
        limit: 50,
    })

    const {
        data: projectMembers = [],
        isLoading: projectMembersLoading,
        error: projectMembersError,
    } = useListProjectMembers(organizationId, projectId)

    const addMember = useAddProjectMember(organizationId, projectId)
    const removeMember = useRemoveProjectMember(organizationId, projectId)

    const projectMemberByUserId = React.useMemo(() => {
        const map = new Map<string, (typeof projectMembers)[number]>()
        for (const m of projectMembers) { map.set(m.userId, m) }
        return map
    }, [projectMembers])

    const orgMembers = React.useMemo(() => orgMembersResponse?.data ?? [], [orgMembersResponse?.data])

    const visibleOrgMembers = React.useMemo(
        () => orgMembers.filter((m) => m.predefinedRole !== PredefinedOrgRole.OWNER),
        [orgMembers]
    )

    type FormValues = {
        selectedByUserId: Record<string, boolean>
        roleByUserId: Record<string, PredefinedOrgRole>
    }

    const { control, setValue, getValues, reset } = useForm<FormValues>({
        defaultValues: {
            selectedByUserId: {},
            roleByUserId: {},
        },
    })

    const selectedByUserId =
        useWatch({ control, name: "selectedByUserId" }) ?? EMPTY_SELECTED
    const roleByUserId =
        useWatch({ control, name: "roleByUserId" }) ?? EMPTY_ROLE_BY_USER_ID

    const selectedUserIds = React.useMemo(
        () => Object.entries(selectedByUserId).filter(([, v]) => v).map(([k]) => k),
        [selectedByUserId]
    )

    const toggleSelected = React.useCallback(
        (userId: string, next: boolean) => {
            setValue(`selectedByUserId.${userId}`, next, { shouldDirty: true })
            if (next) {
                const currentRole = getValues(`roleByUserId.${userId}`)
                if (!currentRole) {
                    setValue(`roleByUserId.${userId}`, PredefinedOrgRole.VIEWER, {
                        shouldDirty: true,
                    })
                }
            }
        },
        [getValues, setValue]
    )

    const addSelected = React.useCallback(async () => {
        if (selectedUserIds.length === 0) { return }

        const values = getValues()
        const entries = selectedUserIds
            .map((userId) => ({
                userId,
                predefinedRole: values.roleByUserId[userId] ?? PredefinedOrgRole.VIEWER,
            }))
            .filter((x) => !projectMemberByUserId.has(x.userId))

        if (entries.length === 0) { return }

        try {
            await Promise.all(entries.map((e) => addMember.mutateAsync(e)))
            reset({ selectedByUserId: {}, roleByUserId: values.roleByUserId })
            toast.success(
                entries.length === 1
                    ? "Member added to project"
                    : `${entries.length} members added to project`
            )
        } catch (err) {
            toast.error("Failed to add some members", {
                description: (err as Error)?.message,
            })
        }
    }, [addMember, getValues, projectMemberByUserId, reset, selectedUserIds])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Add members</h2>
                    <p className="text-sm text-muted-foreground">
                        Choose organization members and assign their project access role.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button type="button" variant="outline" onClick={onBack} className="gap-2">
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                    <Button type="button" onClick={onNext} className="gap-2">
                        Continue
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members by name or email…"
                    className="pl-9"
                />
            </div>

            {(orgMembersError || projectMembersError) && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Couldn’t load members.
                </div>
            )}

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                    <span className="font-semibold">{selectedUserIds.length}</span> selected
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => reset({ selectedByUserId: {}, roleByUserId })}
                        variant="outline"
                        disabled={selectedUserIds.length === 0 || addMember.isPending}
                    >
                        Clear selection
                    </Button>
                    <Button
                        type="button"
                        onClick={addSelected}
                        disabled={selectedUserIds.length === 0 || addMember.isPending}
                        className="gap-2"
                    >
                        <Plus className="size-4" />
                        Add selected
                    </Button>
                </div>
            </div>

            {!projectMembersLoading && projectMembers.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-semibold">Already in project</div>
                    {projectMembers
                        .filter((pm) => pm.predefinedRole !== PredefinedOrgRole.OWNER)
                        .map((pm) => {
                            const orgMember = orgMembers.find((om) => om.userId === pm.userId)
                            const user = orgMember?.user
                            const fullName = [user?.firstName, user?.lastName]
                                .filter(Boolean)
                                .join(" ")
                                .trim()
                            const displayName =
                                fullName || user?.email || user?.id || pm.userId || "Member"

                            return (
                                <Card key={pm.id} className="p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10">
                                                <AvatarImage
                                                    src={user?.avatarUrl ?? undefined}
                                                    alt={displayName}
                                                />
                                                <AvatarFallback>
                                                    {String(displayName)
                                                        .split(" ")
                                                        .slice(0, 2)
                                                        .map((p) => p[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {displayName}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {user?.email ?? pm.userId}
                                                </p>
                                            </div>
                                            {pm.predefinedRole ? (
                                                <Badge variant="outline" className="capitalize">
                                                    {String(pm.predefinedRole).toLowerCase()}
                                                </Badge>
                                            ) : null}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() =>
                                                removeMember.mutate(pm.id, {
                                                    onSuccess: () => {
                                                        toast.success("Member removed from project")
                                                    },
                                                    onError: (err) => {
                                                        toast.error("Failed to remove member", {
                                                            description: (err as Error)?.message,
                                                        })
                                                    },
                                                })
                                            }
                                            disabled={removeMember.isPending}
                                            className="gap-2"
                                        >
                                            <X className="size-4" />
                                            Remove
                                        </Button>
                                    </div>
                                </Card>
                            )
                        })}
                </div>
            )}

            {orgMembersLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-52" />
                                    </div>
                                </div>
                                <Skeleton className="h-9 w-56" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-sm font-semibold">Available members</div>
                    {visibleOrgMembers.length === 0 ? (
                        <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                            No organization members found.
                        </div>
                    ) : (
                        visibleOrgMembers.map((m) => {
                            const user = m.user
                            const fullName = [user?.firstName, user?.lastName]
                                .filter(Boolean)
                                .join(" ")
                                .trim()

                            const displayName =
                                fullName ||
                                user?.email ||
                                user?.id ||
                                m.userId ||
                                "Member"

                            const alreadyInProject = projectMemberByUserId.has(m.userId)
                            const isSelected = !!selectedByUserId?.[m.userId]
                            const roleValue =
                                roleByUserId?.[m.userId] ?? PredefinedOrgRole.VIEWER

                            return (
                                <Card
                                    key={m.id}
                                    className={
                                        "p-4 transition-colors " +
                                        (isSelected ? "border-primary/40 bg-primary/5" : "")
                                    }
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10">
                                                <AvatarImage
                                                    src={user?.avatarUrl ?? undefined}
                                                    alt={displayName}
                                                />
                                                <AvatarFallback>
                                                    {String(displayName)
                                                        .split(" ")
                                                        .slice(0, 2)
                                                        .map((p) => p[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {displayName}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {user?.email ?? m.userId}
                                                </p>
                                            </div>
                                            {m.predefinedRole ? (
                                                <Badge variant="outline" className="capitalize">
                                                    {String(m.predefinedRole).toLowerCase()}
                                                </Badge>
                                            ) : null}
                                            {alreadyInProject ? (
                                                <Badge variant="secondary">Already added</Badge>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <Select
                                                value={roleValue}
                                                onValueChange={(v) =>
                                                    setValue(
                                                        `roleByUserId.${m.userId}`,
                                                        v as PredefinedOrgRole,
                                                        { shouldDirty: true }
                                                    )
                                                }
                                                disabled={!isSelected || alreadyInProject}
                                            >
                                                <SelectTrigger className="w-full sm:w-45">
                                                    <SelectValue placeholder="Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLE_OPTIONS.filter(
                                                        (r) => r.value !== PredefinedOrgRole.OWNER
                                                    ).map((r) => (
                                                        <SelectItem key={r.value} value={r.value}>
                                                            {r.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant={isSelected ? "secondary" : "outline"}
                                                onClick={() =>
                                                    toggleSelected(m.userId, !isSelected)
                                                }
                                                disabled={alreadyInProject}
                                            >
                                                {isSelected ? "Selected" : "Select"}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

