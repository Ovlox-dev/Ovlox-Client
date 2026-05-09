"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    Ban,
    CheckCircle2,
    Mail,
    ShieldCheck,
    User as UserIcon,
} from "lucide-react";

import {
    listAdminUsers,
    blockUser,
    unblockUser,
    setUserRole,
    type AdminUser,
} from "@/entities/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/shared/lib/use-initials";
import { useAuthStore } from "@/entities/auth";

export default function AdminUsersPage() {
    const queryClient = useQueryClient();
    const me = useAuthStore((s) => s.auth.user);

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [blockedFilter, setBlockedFilter] = useState<string>("all");

    const queryParams = useMemo(
        () => ({
            page,
            limit: 25,
            search: search || undefined,
            role: roleFilter === "all" ? undefined : roleFilter,
            blocked:
                blockedFilter === "all"
                    ? undefined
                    : (blockedFilter as "true" | "false"),
        }),
        [page, search, roleFilter, blockedFilter]
    );

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-users", queryParams],
        queryFn: () => listAdminUsers(queryParams),
    });

    const blockMutation = useMutation({
        mutationFn: (userId: string) => blockUser(userId),
        onSuccess: () => {
            toast.success("User blocked");
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to block user"
            ),
    });

    const unblockMutation = useMutation({
        mutationFn: (userId: string) => unblockUser(userId),
        onSuccess: () => {
            toast.success("User unblocked");
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to unblock user"
            ),
    });

    const roleMutation = useMutation({
        mutationFn: ({
            userId,
            role,
        }: {
            userId: string;
            role: "ADMIN" | "USER";
        }) => setUserRole(userId, role),
        onSuccess: (data) => {
            toast.success(`Role set to ${data.role}`);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to change role"
            ),
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
            {/* Header */}
            <header>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-(--line-2) bg-(--bg-2) mb-3">
                    <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                    <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                        admin · users
                    </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--fg)">
                    Users
                </h1>
                <p className="text-sm text-(--fg-2) mt-1">
                    Browse, search, and block platform users.
                    {data ? ` ${data.total} total.` : ""}
                </p>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <form
                    onSubmit={handleSearchSubmit}
                    className="relative flex-1 max-w-md"
                >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-(--fg-3) pointer-events-none" />
                    <Input
                        placeholder="Search by name or email"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9"
                    />
                </form>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger size="default" className="w-[140px]">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={blockedFilter} onValueChange={setBlockedFilter}>
                    <SelectTrigger size="default" className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="false">Active</SelectItem>
                        <SelectItem value="true">Blocked</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* List */}
            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden">
                {isError ? (
                    <div className="p-8 text-center text-(--danger) text-sm">
                        {error instanceof Error
                            ? error.message
                            : "Failed to load users"}
                    </div>
                ) : isLoading ? (
                    <div className="p-12 grid place-items-center">
                        <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                    </div>
                ) : !data?.data.length ? (
                    <div className="p-12 text-center">
                        <UserIcon className="size-6 text-(--fg-3) mx-auto" />
                        <p className="text-(--fg) font-medium mt-3">No users match</p>
                        <p className="text-sm text-(--fg-3) mt-1">
                            Try a different search or filter.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-(--line-2)">
                        {data.data.map((u) => (
                            <UserRow
                                key={u.id}
                                user={u}
                                isMe={u.id === me?.id}
                                onBlock={() => blockMutation.mutate(u.id)}
                                onUnblock={() => unblockMutation.mutate(u.id)}
                                onChangeRole={(role) =>
                                    roleMutation.mutate({ userId: u.id, role })
                                }
                                blocking={
                                    blockMutation.isPending &&
                                    blockMutation.variables === u.id
                                }
                                unblocking={
                                    unblockMutation.isPending &&
                                    unblockMutation.variables === u.id
                                }
                                changingRole={
                                    roleMutation.isPending &&
                                    roleMutation.variables?.userId === u.id
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 ? (
                <div className="flex items-center justify-between text-xs text-(--fg-3) font-mono">
                    <span>
                        Page {data.page} of {data.totalPages} · {data.total} total
                    </span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={data.page <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setPage((p) => Math.min(data.totalPages, p + 1))
                            }
                            disabled={data.page >= data.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function UserRow({
    user,
    isMe,
    onBlock,
    onUnblock,
    onChangeRole,
    blocking,
    unblocking,
    changingRole,
}: {
    user: AdminUser;
    isMe: boolean;
    onBlock: () => void;
    onUnblock: () => void;
    onChangeRole: (role: "ADMIN" | "USER") => void;
    blocking: boolean;
    unblocking: boolean;
    changingRole: boolean;
}) {
    const fullName =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.email ||
        "Unknown";
    const initials = getInitials(fullName);
    const isAdmin = user.role === "ADMIN";

    return (
        <div className="flex items-center gap-4 p-4 transition-colors hover:bg-(--bg-3)/40">
            <Avatar className="size-10 shrink-0 rounded-[10px] border border-(--line-2)">
                {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={fullName} />
                ) : null}
                <AvatarFallback className="rounded-[10px] bg-(--bg-3) text-(--accent-lime) text-xs font-semibold">
                    {initials || "?"}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-(--fg) truncate capitalize">
                        {fullName}
                    </p>
                    {isAdmin ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-[rgba(167,139,255,0.3)] bg-[rgba(167,139,255,0.12)] text-(--accent-4)">
                            <ShieldCheck className="size-3" />
                            Admin
                        </span>
                    ) : null}
                    {isMe ? (
                        <span className="shrink-0 inline-flex rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-(--line-2) bg-(--bg-3) text-(--fg-3)">
                            You
                        </span>
                    ) : null}
                    {user.isDisabled ? (
                        <span className="shrink-0 inline-flex rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.12)] text-(--danger)">
                            Blocked
                        </span>
                    ) : null}
                </div>
                <p className="text-xs text-(--fg-3) truncate font-mono mt-0.5 inline-flex items-center gap-1.5">
                    <Mail className="size-3" />
                    {user.email ?? "—"}
                </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
                {/* ROLE — admin can change anyone EXCEPT themselves
                    (backend enforces this too, the disabled select is
                    just for UX clarity). */}
                <Select
                    value={user.role ?? "USER"}
                    onValueChange={(v) => {
                        if (v !== user.role) onChangeRole(v as "ADMIN" | "USER");
                    }}
                    disabled={isMe || changingRole || user.isDisabled}
                >
                    <SelectTrigger
                        size="sm"
                        className="min-w-[110px]"
                        title={
                            isMe
                                ? "You can't change your own role."
                                : "Change platform role"
                        }
                    >
                        {changingRole ? (
                            <span className="inline-flex items-center gap-1.5 text-(--fg-3)">
                                <Loader2 className="size-3 animate-spin" />
                                Saving
                            </span>
                        ) : (
                            <SelectValue />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USER">
                            <span className="font-medium">User</span>
                        </SelectItem>
                        <SelectItem value="ADMIN">
                            <span className="font-medium text-(--accent-4)">Admin</span>
                        </SelectItem>
                    </SelectContent>
                </Select>

                {/* BLOCK / UNBLOCK */}
                {isMe ? null : user.isDisabled ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onUnblock}
                        disabled={unblocking}
                    >
                        {unblocking ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Unblocking
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="size-3.5" />
                                Unblock
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={onBlock}
                        disabled={blocking}
                    >
                        {blocking ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Blocking
                            </>
                        ) : (
                            <>
                                <Ban className="size-3.5" />
                                Block
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
