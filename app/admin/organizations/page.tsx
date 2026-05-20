"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    Loader2,
    Search,
    Building2,
    ArrowRight,
    FolderGit2,
    Users as UsersIcon,
    Coins,
} from "lucide-react";

import { listAdminOrganizations } from "@/entities/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminOrgsPage() {
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const queryParams = useMemo(
        () => ({
            page,
            limit: 20,
            search: search || undefined,
        }),
        [page, search]
    );

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-orgs", queryParams],
        queryFn: () => listAdminOrganizations(queryParams),
    });

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
            <header>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-(--line-2) bg-(--bg-2) mb-3">
                    <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                    <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                        admin · organizations
                    </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--fg)">
                    Organizations
                </h1>
                <p className="text-sm text-(--fg-2) mt-1">
                    Every org on the platform.
                    {data ? ` ${data.total} total.` : ""}
                </p>
            </header>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setPage(1);
                    setSearch(searchInput.trim());
                }}
                className="relative max-w-md"
            >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-(--fg-3) pointer-events-none" />
                <Input
                    placeholder="Search by name or slug"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                />
            </form>

            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden">
                {isError ? (
                    <div className="p-8 text-center text-(--danger) text-sm">
                        {error instanceof Error
                            ? error.message
                            : "Failed to load organizations"}
                    </div>
                ) : isLoading ? (
                    <div className="p-12 grid place-items-center">
                        <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                    </div>
                ) : !data?.data.length ? (
                    <div className="p-12 text-center">
                        <Building2 className="size-6 text-(--fg-3) mx-auto" />
                        <p className="text-(--fg) font-medium mt-3">
                            No organizations
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-(--line-2)">
                        {data.data.map((org) => (
                            <Link
                                key={org.id}
                                href={`/admin/organizations/${org.id}`}
                                className="flex items-center gap-4 p-4 transition-colors hover:bg-(--bg-3)/40 group"
                            >
                                <div className="size-10 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-3) text-(--fg-2)">
                                    <Building2 className="size-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-(--fg) truncate">
                                            {org.name}
                                        </p>
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                            {org.slug}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-[11px] font-mono text-(--fg-3)">
                                        <span className="inline-flex items-center gap-1">
                                            <UsersIcon className="size-3" />
                                            {org.memberCount} members
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <FolderGit2 className="size-3" />
                                            {org.projectCount} projects
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-(--accent-lime)">
                                            <Coins className="size-3" />
                                            {Number(org.creditBalance ?? 0).toLocaleString()} credits
                                        </span>
                                    </div>
                                    {org.ownerEmail ? (
                                        <p className="mt-0.5 text-[11px] text-(--fg-3) truncate">
                                            Owner: {org.ownerFirstName} {org.ownerLastName}{" "}
                                            <span className="font-mono">
                                                ({org.ownerEmail})
                                            </span>
                                        </p>
                                    ) : null}
                                </div>

                                <ArrowRight className="size-4 text-(--fg-3) group-hover:text-(--accent-lime) transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

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
