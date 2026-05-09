"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { IoLogoGithub } from "react-icons/io5"
import { GitBranch, ExternalLink, Loader2 } from "lucide-react"

import {
    getGithubRepositories,
    syncGithubRepositories,
    getGithubInstallUrl,
} from "@/entities/github"
import { ExternalProvider } from "@/types/enum"
import { Skeleton } from "@/components/ui/skeleton"

import { ProviderHeader } from "@/widgets/integrations/ui/provider-header"
import { ProviderInstances } from "@/widgets/integrations/ui/provider-instances"
import { IntegrationActions } from "@/widgets/integrations/ui/integration-actions"

export default function GitHubIntegrationPage() {
    const router = useRouter()
    const pathname = usePathname()
    const params = useParams<{ organizationId: string }>()
    const searchParams = useSearchParams()
    const organizationId = params?.organizationId ?? ""
    const integrationId = searchParams?.get("integrationId") ?? ""

    const setIntegrationId = React.useCallback(
        (id: string) => {
            const next = new URLSearchParams(searchParams?.toString() ?? "")
            next.set("integrationId", id)
            router.replace(`${pathname}?${next.toString()}`, { scroll: false })
        },
        [router, pathname, searchParams]
    )

    const [syncing, setSyncing] = React.useState(false)

    const {
        data: reposData,
        isLoading: reposLoading,
        error: reposError,
        refetch: refetchRepos,
    } = useQuery({
        queryKey: ["getGithubRepositories", integrationId],
        queryFn: () => getGithubRepositories(integrationId),
        enabled: !!integrationId,
    })

    const handleSync = React.useCallback(async () => {
        if (!integrationId) return
        try {
            setSyncing(true)
            await syncGithubRepositories(integrationId, undefined, { force: true })
            await refetchRepos()
        } finally {
            setSyncing(false)
        }
    }, [integrationId, refetchRepos])

    const repos = reposData?.data ?? []

    return (
        <div className="space-y-6">
            <ProviderHeader
                icon={IoLogoGithub}
                title="GitHub"
                description="Manage repositories synced into Ovlox."
                actions={
                    <IntegrationActions
                        provider="GitHub"
                        organizationId={organizationId}
                        integrationId={integrationId}
                        getReinstallUrl={async (orgId) => getGithubInstallUrl(orgId)}
                        onSync={handleSync}
                        isSyncing={syncing}
                    />
                }
            />

            <ProviderInstances
                organizationId={organizationId}
                provider={ExternalProvider.GITHUB}
                providerName="GitHub"
                icon={IoLogoGithub}
                selectedIntegrationId={integrationId}
                onSelect={setIntegrationId}
            />

            {integrationId ? (
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-(--line-2)">
                        <div>
                            <div className="text-sm font-semibold text-(--fg)">
                                Repositories
                            </div>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                {repos.length} {repos.length === 1 ? "repo" : "repos"} indexed
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        {reposError ? (
                            <ErrorBlock message={reposError.message} />
                        ) : reposLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <RepoSkeleton key={i} />
                                ))}
                            </div>
                        ) : repos.length === 0 ? (
                            <EmptyBlock
                                title="No repositories"
                                body="Click Sync to pull repositories from GitHub, or grant the GitHub App access to repos."
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {repos.map((r) => (
                                    <article
                                        key={String(r.id)}
                                        className="rounded-[12px] border border-(--line-2) bg-(--bg-3) p-4 transition-colors hover:border-(--accent-lime)/30"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="size-8 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-2) text-(--fg-2)">
                                                <GitBranch className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-(--fg) truncate">
                                                    {r.name}
                                                </p>
                                                {r.url ? (
                                                    <a
                                                        href={r.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-0.5 text-xs text-(--fg-3) hover:text-(--accent-lime) truncate font-mono inline-flex items-center gap-1"
                                                    >
                                                        <span className="truncate">{r.url}</span>
                                                        <ExternalLink className="size-3 shrink-0" />
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                            <div>
                                                <div>Updated</div>
                                                <div className="text-(--fg-2) normal-case tracking-normal mt-0.5">
                                                    {r.updated_at
                                                        ? new Date(r.updated_at).toLocaleDateString()
                                                        : "—"}
                                                </div>
                                            </div>
                                            <div>
                                                <div>Pushed</div>
                                                <div className="text-(--fg-2) normal-case tracking-normal mt-0.5">
                                                    {r.pushed_at
                                                        ? new Date(r.pushed_at).toLocaleDateString()
                                                        : "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    )
}

function RepoSkeleton() {
    return (
        <div className="rounded-[12px] border border-(--line-2) bg-(--bg-3) p-4 space-y-3">
            <div className="flex gap-3">
                <Skeleton className="size-8 rounded-[8px] bg-(--bg-2)" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 bg-(--bg-2)" />
                    <Skeleton className="h-3 w-44 bg-(--bg-2)" />
                </div>
            </div>
            <Skeleton className="h-6 bg-(--bg-2)" />
        </div>
    )
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
    return (
        <div className="text-center py-10">
            <p className="text-(--fg) font-medium">{title}</p>
            <p className="text-sm text-(--fg-3) mt-1 max-w-sm mx-auto">{body}</p>
        </div>
    )
}

function ErrorBlock({ message }: { message: string }) {
    return (
        <div className="rounded-[12px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-4 inline-flex items-center gap-2">
            <Loader2 className="size-4 text-(--danger) hidden" />
            <p className="text-sm text-(--danger)">{message}</p>
        </div>
    )
}
