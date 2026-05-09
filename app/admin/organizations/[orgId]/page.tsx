"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Loader2,
    FolderGit2,
    Coins,
    Plus,
    History,
    Sparkles,
} from "lucide-react";

import {
    listAdminOrgProjects,
    getAdminOrgCredits,
    grantOrgCredits,
} from "@/entities/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal";

export default function AdminOrgDetailPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params?.orgId ?? "";
    const queryClient = useQueryClient();

    const projectsQuery = useQuery({
        queryKey: ["admin-org-projects", orgId],
        queryFn: () => listAdminOrgProjects(orgId),
        enabled: !!orgId,
    });

    const creditsQuery = useQuery({
        queryKey: ["admin-org-credits", orgId],
        queryFn: () => getAdminOrgCredits(orgId),
        enabled: !!orgId,
    });

    const [grantOpen, setGrantOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    const grantMutation = useMutation({
        mutationFn: () =>
            grantOrgCredits(orgId, {
                amount: Number(amount),
                description: description.trim() || undefined,
            }),
        onSuccess: () => {
            toast.success(`Granted ${amount} credits`);
            setGrantOpen(false);
            setAmount("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ["admin-org-credits", orgId] });
            queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
        },
        onError: (err) =>
            toast.error(
                err instanceof Error ? err.message : "Failed to grant credits"
            ),
    });

    const org = creditsQuery.data?.organization;
    const grants = creditsQuery.data?.activeGrants ?? [];
    const transactions = creditsQuery.data?.recentTransactions ?? [];
    const projects = projectsQuery.data ?? [];

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
            <Link
                href="/admin/organizations"
                className="inline-flex items-center gap-1.5 text-(--fg-3) hover:text-(--fg) transition-colors text-sm"
            >
                <ArrowLeft className="size-4" />
                All organizations
            </Link>

            <header>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-(--line-2) bg-(--bg-2) mb-3">
                    <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                    <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                        admin · organization
                    </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-(--fg)">
                    {org?.name ?? (creditsQuery.isLoading ? "Loading…" : "Unknown")}
                </h1>
                {org?.slug ? (
                    <p className="text-xs text-(--fg-3) mt-1 font-mono">{org.slug}</p>
                ) : null}
            </header>

            {/* Credit summary */}
            <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-(--fg-3)">
                            Credit balance
                        </p>
                        <p className="text-3xl font-semibold tracking-tight text-(--accent-lime) mt-1 tabular-nums inline-flex items-center gap-2">
                            <Coins className="size-6" />
                            {Number(org?.creditBalance ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-(--fg-3) mt-1">
                            {grants.length} active{" "}
                            {grants.length === 1 ? "grant" : "grants"}
                        </p>
                    </div>
                    <Button onClick={() => setGrantOpen(true)}>
                        <Plus className="size-4" />
                        Grant credits
                    </Button>
                </div>
            </section>

            {/* Two-up grid: projects + recent transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Projects */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="px-5 py-4 border-b border-(--line-2) flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-(--fg)">
                                Projects
                            </h2>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                {projects.length}{" "}
                                {projects.length === 1 ? "project" : "projects"}
                            </p>
                        </div>
                    </div>
                    <div className="p-5">
                        {projectsQuery.isLoading ? (
                            <div className="grid place-items-center py-8">
                                <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                            </div>
                        ) : !projects.length ? (
                            <div className="text-center py-8">
                                <FolderGit2 className="size-5 text-(--fg-3) mx-auto" />
                                <p className="text-sm text-(--fg-3) mt-2">
                                    No projects in this org.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {projects.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex items-center gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2.5"
                                    >
                                        <FolderGit2 className="size-4 text-(--fg-2) shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-(--fg) truncate">
                                                {p.name}
                                            </p>
                                            <p className="text-[11px] text-(--fg-3) font-mono truncate">
                                                {p.slug}
                                            </p>
                                        </div>
                                        <span
                                            className={
                                                p.status === "ACTIVE"
                                                    ? "shrink-0 inline-flex rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)"
                                                    : "shrink-0 inline-flex rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-(--line-2) bg-(--bg-2) text-(--fg-3)"
                                            }
                                        >
                                            {p.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* Recent transactions */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="px-5 py-4 border-b border-(--line-2)">
                        <h2 className="text-sm font-semibold text-(--fg)">
                            Recent credit activity
                        </h2>
                        <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                            Last 25 transactions
                        </p>
                    </div>
                    <div className="p-5">
                        {creditsQuery.isLoading ? (
                            <div className="grid place-items-center py-8">
                                <Loader2 className="size-5 animate-spin text-(--fg-3)" />
                            </div>
                        ) : !transactions.length ? (
                            <div className="text-center py-8">
                                <History className="size-5 text-(--fg-3) mx-auto" />
                                <p className="text-sm text-(--fg-3) mt-2">
                                    No transactions yet.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {transactions.map((t) => (
                                    <li
                                        key={t.id}
                                        className="flex items-center gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2.5"
                                    >
                                        <Sparkles
                                            className={
                                                t.type === "PURCHASE" ||
                                                t.type === "BONUS" ||
                                                t.type === "ADJUSTMENT"
                                                    ? "size-4 text-(--accent-2) shrink-0"
                                                    : "size-4 text-(--fg-3) shrink-0"
                                            }
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                                                    {t.type}
                                                </span>
                                                <span
                                                    className={
                                                        t.status === "COMPLETED"
                                                            ? "font-mono uppercase tracking-wider text-[10px] text-(--accent-2)"
                                                            : "font-mono uppercase tracking-wider text-[10px] text-(--fg-3)"
                                                    }
                                                >
                                                    · {t.status}
                                                </span>
                                            </div>
                                            {t.description ? (
                                                <p className="text-xs text-(--fg-2) truncate mt-0.5">
                                                    {t.description}
                                                </p>
                                            ) : null}
                                            <p className="text-[10px] text-(--fg-3) font-mono mt-0.5">
                                                {new Date(t.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <span
                                            className={
                                                Number(t.amount) >= 0
                                                    ? "shrink-0 text-sm font-semibold text-(--accent-lime) tabular-nums"
                                                    : "shrink-0 text-sm font-semibold text-(--danger) tabular-nums"
                                            }
                                        >
                                            {Number(t.amount) >= 0 ? "+" : ""}
                                            {Number(t.amount).toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            {/* Grant modal */}
            <CustomModal open={grantOpen} onOpenChange={setGrantOpen}>
                <CustomModalHeader>
                    <CustomModalTitle>Grant credits to {org?.name}</CustomModalTitle>
                    <CustomModalDescription>
                        Adds an admin grant directly to this organization&apos;s
                        balance. Use for promo grants, support credits, or making
                        good on incidents.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-wider text-(--fg-3)">
                                Amount
                            </label>
                            <Input
                                type="number"
                                placeholder="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min={0.01}
                                step={0.01}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-wider text-(--fg-3)">
                                Note (optional)
                            </label>
                            <Textarea
                                placeholder="Why this grant?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                </CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setGrantOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => grantMutation.mutate()}
                        disabled={
                            grantMutation.isPending ||
                            !amount ||
                            Number(amount) <= 0
                        }
                    >
                        {grantMutation.isPending ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Granting…
                            </>
                        ) : (
                            "Grant credits"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>
        </div>
    );
}
