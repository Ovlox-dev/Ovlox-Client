"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Loader2,
    Mail,
    GitCommit,
    GitPullRequest,
    MessageSquare,
    CheckSquare,
    MoreHorizontal,
    Plus,
    Unlink,
    Trash2,
    FolderGit2,
    User as UserIcon,
} from "lucide-react";
import {
    IoLogoGithub,
} from "react-icons/io5";
import {
    SiSlack,
    SiJira,
    SiLinear,
    SiNotion,
    SiFigma,
    SiDiscord,
} from "react-icons/si";
import type { IconType } from "react-icons";

import { listMembers } from "@/entities/organization/api/org";
import {
    listMemberIdentities,
    getMemberContributions,
    listUnmappedIdentities,
    linkIdentityToMember,
    unlinkContributorMap,
    createIdentityAlias,
    deleteIdentityAlias,
    type MemberIdentity,
    type UnmappedIdentity,
} from "@/entities/contributors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/shared/ui/role-badge";
import { getInitials } from "@/shared/lib/use-initials";
import { ContributionHeatmap } from "@/widgets/contribution-heatmap";
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal";
const PROVIDER_ICONS: Record<string, IconType> = {
    GITHUB: IoLogoGithub,
    SLACK: SiSlack,
    JIRA: SiJira,
    LINEAR: SiLinear,
    NOTION: SiNotion,
    FIGMA: SiFigma,
    DISCORD: SiDiscord,
};

export default function MemberDetailPage() {
    const params = useParams<{ organizationId: string; memberId: string }>();
    const organizationId = params?.organizationId ?? "";
    const memberId = params?.memberId ?? "";
    const queryClient = useQueryClient();

    // Re-use the org-wide members list (likely already cached from the list page).
    const membersQuery = useQuery({
        queryKey: ["orgMembers", organizationId],
        queryFn: async () =>
            (await listMembers(organizationId, { limit: 500 }))?.data ?? [],
        enabled: !!organizationId,
    });

    const member = useMemo(
        () => membersQuery.data?.find((m) => m.id === memberId),
        [membersQuery.data, memberId]
    );

    const identitiesQuery = useQuery({
        queryKey: ["memberIdentities", organizationId, memberId],
        queryFn: () => listMemberIdentities(organizationId, memberId),
        enabled: !!organizationId && !!memberId,
    });

    const contribQuery = useQuery({
        queryKey: ["memberContributions", organizationId, memberId, 365],
        queryFn: () => getMemberContributions(organizationId, memberId, 365),
        enabled: !!organizationId && !!memberId,
    });

    const [linkOpen, setLinkOpen] = useState(false);

    const fullName =
        `${member?.user?.firstName ?? ""} ${member?.user?.lastName ?? ""}`.trim() ||
        member?.user?.email ||
        "Member";
    const initials = getInitials(fullName);

    const totals = contribQuery.data?.totals;
    const heatmap = contribQuery.data?.heatmap ?? [];
    const perProject = contribQuery.data?.perProject ?? [];

    return (
        <div className="space-y-7">
            {/* TOP BAR */}
            <div>
                <Link
                    href={`/${organizationId}/members`}
                    className="inline-flex items-center gap-1.5 text-sm text-(--fg-3) hover:text-(--fg) transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    All members
                </Link>
            </div>

            {/* HEADER */}
            <header className="flex flex-col sm:flex-row sm:items-center gap-5">
                <Avatar className="size-20 shrink-0 rounded-[16px] border border-(--line-2)">
                    {member?.user?.avatarUrl ? (
                        <AvatarImage
                            src={member.user.avatarUrl}
                            alt={fullName}
                        />
                    ) : null}
                    <AvatarFallback className="rounded-[16px] bg-(--bg-3) text-(--accent-lime) text-xl font-semibold">
                        {initials || "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-(--line-2) bg-(--bg-2) mb-2">
                        <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                        <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                            Member profile
                        </span>
                    </div>
                    {membersQuery.isLoading ? (
                        <Skeleton className="h-9 w-64 bg-(--bg-3)" />
                    ) : (
                        <h1 className="text-3xl font-semibold tracking-tight text-(--fg) capitalize truncate">
                            {fullName}
                        </h1>
                    )}
                    <p className="text-sm text-(--fg-3) truncate font-mono mt-1 inline-flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        {member?.user?.email ?? "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <RoleBadge role={member?.predefinedRole} />
                        {member?.createdAt ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-(--line-2) bg-(--bg-3) text-(--fg-3)">
                                Member since {new Date(member.createdAt).toLocaleDateString()}
                            </span>
                        ) : null}
                    </div>
                </div>
            </header>

            {/* STAT ROW */}
            <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard
                    icon={<MoreHorizontal className="size-3.5" />}
                    label="Total"
                    value={totals?.total ?? 0}
                    accent
                    loading={contribQuery.isLoading}
                />
                <StatCard
                    icon={<GitCommit className="size-3.5" />}
                    label="Commits"
                    value={totals?.commits ?? 0}
                    loading={contribQuery.isLoading}
                />
                <StatCard
                    icon={<GitPullRequest className="size-3.5" />}
                    label="Pull requests"
                    value={totals?.pullRequests ?? 0}
                    loading={contribQuery.isLoading}
                />
                <StatCard
                    icon={<MessageSquare className="size-3.5" />}
                    label="Messages"
                    value={totals?.messages ?? 0}
                    loading={contribQuery.isLoading}
                />
                <StatCard
                    icon={<CheckSquare className="size-3.5" />}
                    label="Tasks"
                    value={totals?.tasks ?? 0}
                    loading={contribQuery.isLoading}
                />
            </section>

            {/* HEATMAP */}
            <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-(--fg)">
                            Activity heatmap
                        </h2>
                        <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                            Last 365 days · per UTC day
                        </p>
                    </div>
                </div>
                {contribQuery.isLoading ? (
                    <Skeleton className="h-32 bg-(--bg-3)" />
                ) : (
                    <ContributionHeatmap data={heatmap} days={365} />
                )}
            </section>

            {/* PER-PROJECT + IDENTITIES side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* PER-PROJECT */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="px-5 py-4 border-b border-(--line-2)">
                        <h2 className="text-sm font-semibold text-(--fg)">By project</h2>
                        <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                            {perProject.length}{" "}
                            {perProject.length === 1 ? "project" : "projects"} touched
                        </p>
                    </div>
                    <div className="p-5">
                        {contribQuery.isLoading ? (
                            <Skeleton className="h-24 bg-(--bg-3)" />
                        ) : !perProject.length ? (
                            <EmptyBlock
                                icon={<FolderGit2 className="size-5 text-(--fg-3)" />}
                                title="No project activity"
                                body="This member has no recorded events in the last year. Link their external identity below to start attributing contributions."
                            />
                        ) : (
                            <ul className="space-y-2.5">
                                {perProject.slice(0, 8).map((p) => {
                                    const ratio = totals?.total
                                        ? (p.count / totals.total) * 100
                                        : 0;
                                    return (
                                        <li
                                            key={p.projectId}
                                            className="rounded-[10px] border border-(--line-2) bg-(--bg-3) p-3"
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                                <Link
                                                    href={`/${organizationId}/projects/${p.projectSlug || p.projectId}`}
                                                    className="text-sm font-medium text-(--fg) hover:text-(--accent-lime) truncate transition-colors"
                                                >
                                                    {p.projectName}
                                                </Link>
                                                <span className="text-sm font-semibold text-(--accent-lime) tabular-nums shrink-0">
                                                    {p.count.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full bg-(--bg-2) overflow-hidden">
                                                <div
                                                    className="h-full bg-(--accent-lime)"
                                                    style={{ width: `${Math.max(2, ratio)}%` }}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </section>

                {/* LINKED IDENTITIES */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="px-5 py-4 border-b border-(--line-2) flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-(--fg)">
                                Linked identities
                            </h2>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                Maps this member across every connected platform
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLinkOpen(true)}
                        >
                            <Plus className="size-3.5" />
                            Link identity
                        </Button>
                    </div>
                    <div className="p-5">
                        {identitiesQuery.isLoading ? (
                            <Skeleton className="h-24 bg-(--bg-3)" />
                        ) : !identitiesQuery.data?.length ? (
                            <EmptyBlock
                                icon={<UserIcon className="size-5 text-(--fg-3)" />}
                                title="No linked identities"
                                body="Link an unmapped identity (commits, messages, tasks from your integrations) to start attributing activity to this member."
                            />
                        ) : (
                            <ul className="space-y-3">
                                {identitiesQuery.data.map((identity) => (
                                    <IdentityCard
                                        key={identity.id}
                                        organizationId={organizationId}
                                        memberId={memberId}
                                        identity={identity}
                                        onMutate={() => {
                                            void queryClient.invalidateQueries({
                                                queryKey: [
                                                    "memberIdentities",
                                                    organizationId,
                                                    memberId,
                                                ],
                                            });
                                            void queryClient.invalidateQueries({
                                                queryKey: [
                                                    "memberContributions",
                                                    organizationId,
                                                    memberId,
                                                ],
                                            });
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            {/* LINK identity modal */}
            <LinkIdentityModal
                open={linkOpen}
                onOpenChange={setLinkOpen}
                organizationId={organizationId}
                memberId={memberId}
            />
        </div>
    );
}

/* ---------- subcomponents ---------- */

function StatCard({
    icon,
    label,
    value,
    accent,
    loading,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    accent?: boolean;
    loading?: boolean;
}) {
    return (
        <div className="rounded-[12px] border border-(--line) bg-(--bg-2) p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                {icon}
                {label}
            </div>
            <div
                className={`mt-2 text-2xl font-semibold tabular-nums ${
                    accent ? "text-(--accent-lime)" : "text-(--fg)"
                }`}
            >
                {loading ? (
                    <Skeleton className="h-7 w-12 bg-(--bg-3)" />
                ) : (
                    value.toLocaleString()
                )}
            </div>
        </div>
    );
}

function EmptyBlock({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="text-center py-8 px-4">
            <div className="inline-grid size-10 place-items-center rounded-full bg-(--bg-3) border border-(--line-2) mb-3">
                {icon}
            </div>
            <p className="text-sm text-(--fg) font-medium">{title}</p>
            <p className="text-xs text-(--fg-3) mt-1 max-w-sm mx-auto">{body}</p>
        </div>
    );
}

function IdentityCard({
    organizationId,
    memberId,
    identity,
    onMutate,
}: {
    organizationId: string;
    memberId: string;
    identity: MemberIdentity;
    onMutate: () => void;
}) {
    const queryClient = useQueryClient();
    const Icon =
        PROVIDER_ICONS[String(identity.provider).toUpperCase()] ?? UserIcon;
    const [showAliasForm, setShowAliasForm] = useState(false);
    const [aliasInput, setAliasInput] = useState("");

    const unlinkMutation = useMutation({
        mutationFn: () => unlinkContributorMap(organizationId, identity.mapId),
        onSuccess: () => {
            toast.success("Identity unlinked");
            onMutate();
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to unlink identity"
            ),
    });

    const aliasCreateMutation = useMutation({
        mutationFn: () =>
            createIdentityAlias(organizationId, identity.id, {
                alias: aliasInput.trim(),
            }),
        onSuccess: () => {
            toast.success("Alias added");
            setAliasInput("");
            setShowAliasForm(false);
            void queryClient.invalidateQueries({
                queryKey: ["memberIdentities", organizationId, memberId],
            });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to add alias"
            ),
    });

    const aliasDeleteMutation = useMutation({
        mutationFn: (aliasId: string) =>
            deleteIdentityAlias(organizationId, identity.id, aliasId),
        onSuccess: () => {
            toast.success("Alias removed");
            void queryClient.invalidateQueries({
                queryKey: ["memberIdentities", organizationId, memberId],
            });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to remove alias"
            ),
    });

    return (
        <li className="rounded-[10px] border border-(--line-2) bg-(--bg-3) p-3">
            <div className="flex items-start gap-3">
                <div className="size-9 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-2)">
                    <Icon className="size-4 text-(--fg)" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-(--fg) truncate">
                            {identity.displayName ?? identity.providerUserId}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                            {String(identity.provider).toLowerCase()}
                        </span>
                    </div>
                    <p className="text-xs text-(--fg-3) font-mono truncate mt-0.5">
                        {identity.providerUserId}
                    </p>
                </div>
                <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                    title="Unlink this identity"
                >
                    {unlinkMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <Unlink className="size-3.5" />
                    )}
                </Button>
            </div>

            {/* aliases */}
            {identity.aliases.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                    {identity.aliases.map((al) => (
                        <li
                            key={al.id}
                            className="group inline-flex items-center gap-1.5 rounded-full border border-(--line-2) bg-(--bg-2) pl-2.5 pr-1 py-0.5 text-xs"
                        >
                            <span className="text-(--fg) font-mono">{al.alias}</span>
                            <button
                                type="button"
                                onClick={() =>
                                    aliasDeleteMutation.mutate(al.id)
                                }
                                disabled={aliasDeleteMutation.isPending}
                                className="size-4 grid place-items-center rounded-full text-(--fg-3) hover:text-(--danger) transition-colors"
                                title="Remove alias"
                            >
                                <Trash2 className="size-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}

            {/* add alias */}
            <div className="mt-3">
                {showAliasForm ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (aliasInput.trim())
                                aliasCreateMutation.mutate();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder="Add alias (e.g. ada.l, ada@old.com)"
                            value={aliasInput}
                            onChange={(e) => setAliasInput(e.target.value)}
                            autoFocus
                            className="h-8 text-xs"
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                !aliasInput.trim() || aliasCreateMutation.isPending
                            }
                        >
                            Add
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setAliasInput("");
                                setShowAliasForm(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </form>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowAliasForm(true)}
                        className="text-xs text-(--fg-3) hover:text-(--accent-lime) transition-colors inline-flex items-center gap-1 font-mono uppercase tracking-wider"
                    >
                        <Plus className="size-3" />
                        Add alias
                    </button>
                )}
            </div>
        </li>
    );
}

function LinkIdentityModal({
    open,
    onOpenChange,
    organizationId,
    memberId,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    organizationId: string;
    memberId: string;
}) {
    const queryClient = useQueryClient();
    const unmappedQuery = useQuery({
        queryKey: ["unmappedIdentities", organizationId],
        queryFn: () => listUnmappedIdentities(organizationId),
        enabled: open && !!organizationId,
    });

    const linkMutation = useMutation({
        mutationFn: (identityId: string) =>
            linkIdentityToMember(organizationId, { identityId, memberId }),
        onSuccess: () => {
            toast.success("Identity linked");
            void queryClient.invalidateQueries({
                queryKey: ["memberIdentities", organizationId, memberId],
            });
            void queryClient.invalidateQueries({
                queryKey: ["memberContributions", organizationId, memberId],
            });
            void queryClient.invalidateQueries({
                queryKey: ["unmappedIdentities", organizationId],
            });
            void queryClient.invalidateQueries({
                queryKey: ["orgMemberStats", organizationId],
            });
            onOpenChange(false);
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to link identity"
            ),
    });

    return (
        <CustomModal open={open} onOpenChange={onOpenChange}>
            <CustomModalHeader>
                <CustomModalTitle>Link an identity to this member</CustomModalTitle>
                <CustomModalDescription>
                    Identities are external user records (a GitHub login, a Slack
                    user, a Jira reporter, etc.) seen in your ingested events but
                    not yet attributed to anyone. Linking one assigns every event
                    authored by that identity to this member — going back AND
                    forward.
                </CustomModalDescription>
            </CustomModalHeader>
            <CustomModalBody>
                {unmappedQuery.isLoading ? (
                    <div className="grid place-items-center py-8">
                        <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                    </div>
                ) : !unmappedQuery.data?.length ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-(--fg) font-medium">
                            All identities mapped
                        </p>
                        <p className="text-xs text-(--fg-3) mt-1">
                            Every external identity in this org has already been
                            linked to a member.
                        </p>
                    </div>
                ) : (
                    <ul className="max-h-80 overflow-y-auto space-y-2 -mx-1 px-1">
                        {unmappedQuery.data.map((id) => (
                            <UnmappedRow
                                key={id.id}
                                identity={id}
                                pending={
                                    linkMutation.isPending &&
                                    linkMutation.variables === id.id
                                }
                                onLink={() => linkMutation.mutate(id.id)}
                            />
                        ))}
                    </ul>
                )}
            </CustomModalBody>
            <CustomModalFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                </Button>
            </CustomModalFooter>
        </CustomModal>
    );
}

function UnmappedRow({
    identity,
    pending,
    onLink,
}: {
    identity: UnmappedIdentity;
    pending: boolean;
    onLink: () => void;
}) {
    const Icon =
        PROVIDER_ICONS[String(identity.provider).toUpperCase()] ?? UserIcon;
    return (
        <li className="flex items-center gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) p-3">
            <div className="size-9 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-2)">
                <Icon className="size-4 text-(--fg)" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-(--fg) truncate">
                        {identity.displayName ?? identity.providerUserId}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                        {String(identity.provider).toLowerCase()}
                    </span>
                </div>
                <p className="text-xs text-(--fg-3) font-mono truncate mt-0.5">
                    {identity.providerUserId}
                    {identity.rawEvents.length
                        ? ` · ${identity.rawEvents.length} recent event${identity.rawEvents.length === 1 ? "" : "s"}`
                        : ""}
                </p>
            </div>
            <Button size="sm" onClick={onLink} disabled={pending}>
                {pending ? (
                    <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Linking
                    </>
                ) : (
                    "Link"
                )}
            </Button>
        </li>
    );
}
