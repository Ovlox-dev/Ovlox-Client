"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Coins, ArrowRight, Loader2, Plus, Building2 } from "lucide-react";

import { listAdminOrganizations } from "@/entities/admin";
import { Button } from "@/components/ui/button";

export default function AdminCreditsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-orgs", { page: 1, limit: 50 }],
        queryFn: () => listAdminOrganizations({ page: 1, limit: 50 }),
    });

    const orgs = data?.data ?? [];
    const totalCredits = orgs.reduce(
        (sum, o) => sum + Number(o.creditBalance ?? 0),
        0
    );

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
            <header>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-(--line-2) bg-(--bg-2) mb-3">
                    <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                    <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                        admin · credits
                    </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--fg)">
                    Credits
                </h1>
                <p className="text-sm text-(--fg-2) mt-1">
                    Pick an organization to view balance, grants, and recent activity.
                </p>
            </header>

            {/* Aggregate stat */}
            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-(--fg-3)">
                    Total credits across all orgs
                </p>
                <p className="text-3xl font-semibold tracking-tight text-(--accent-lime) mt-1 tabular-nums inline-flex items-center gap-2">
                    <Coins className="size-6" />
                    {totalCredits.toLocaleString()}
                </p>
                <p className="text-xs text-(--fg-3) mt-1">
                    Across {orgs.length}{" "}
                    {orgs.length === 1 ? "organization" : "organizations"}
                </p>
            </div>

            {/* Org list */}
            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden">
                <div className="px-5 py-4 border-b border-(--line-2)">
                    <h2 className="text-sm font-semibold text-(--fg)">
                        By organization
                    </h2>
                    <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                        Click an org to manage grants
                    </p>
                </div>

                {isLoading ? (
                    <div className="p-12 grid place-items-center">
                        <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                    </div>
                ) : !orgs.length ? (
                    <div className="p-12 text-center">
                        <Building2 className="size-6 text-(--fg-3) mx-auto" />
                        <p className="text-(--fg) font-medium mt-3">No organizations</p>
                    </div>
                ) : (
                    <div className="divide-y divide-(--line-2)">
                        {orgs.map((org) => (
                            <Link
                                key={org.id}
                                href={`/admin/organizations/${org.id}`}
                                className="flex items-center gap-4 p-4 transition-colors hover:bg-(--bg-3)/40 group"
                            >
                                <div className="size-10 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-3) text-(--fg-2)">
                                    <Building2 className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-(--fg) truncate">
                                        {org.name}
                                    </p>
                                    <p className="text-[11px] text-(--fg-3) font-mono truncate">
                                        {org.slug}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-(--accent-lime) tabular-nums inline-flex items-center gap-1">
                                        <Coins className="size-3.5" />
                                        {Number(org.creditBalance ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-(--fg-3) font-mono mt-0.5">
                                        balance
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" className="shrink-0">
                                    <Plus className="size-3.5" />
                                    Grant
                                </Button>
                                <ArrowRight className="size-4 text-(--fg-3) group-hover:text-(--accent-lime) transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
