"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
import { SiJira } from "react-icons/si"
import { FolderKanban, Lock, Globe } from "lucide-react"
import { useGetJiraProjects, useSyncJiraProjects } from "@/shared/queries/jira.queries"
import { getJiraInstallUrl } from "@/shared/api/integration-jira"
import { ExternalProvider } from "@/types/enum"
import { Skeleton } from "@/components/ui/skeleton"

import { ProviderHeader } from "@/widgets/integrations/ui/provider-header"
import { ProviderInstances } from "@/widgets/integrations/ui/provider-instances"
import { IntegrationActions } from "@/widgets/integrations/ui/integration-actions"

export default function JiraIntegrationPage() {
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

    const {
        data: projects,
        isLoading,
        error,
    } = useGetJiraProjects(integrationId)
    const syncMutation = useSyncJiraProjects()

    const handleSync = React.useCallback(async () => {
        if (!integrationId) { return }
        await syncMutation.mutateAsync({ integrationId })
    }, [integrationId, syncMutation])

    return (
        <div className="space-y-6">
            <ProviderHeader
                icon={SiJira}
                title="Jira"
                description="Manage projects and sync issues."
                actions={
                    <IntegrationActions
                        provider="Jira"
                        organizationId={organizationId}
                        integrationId={integrationId}
                        getReinstallUrl={getJiraInstallUrl}
                        onSync={handleSync}
                        isSyncing={syncMutation.isPending}
                    />
                }
            />

            <ProviderInstances
                organizationId={organizationId}
                provider={ExternalProvider.JIRA}
                providerName="Jira"
                icon={SiJira}
                selectedIntegrationId={integrationId}
                onSelect={setIntegrationId}
            />

            {integrationId ? (
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2)">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-(--line-2)">
                        <div>
                            <div className="text-sm font-semibold text-(--fg)">
                                Projects
                            </div>
                            <p className="text-xs text-(--fg-3) font-mono mt-0.5">
                                {projects?.length ?? 0} {(projects?.length ?? 0) === 1 ? "project" : "projects"} synced
                            </p>
                        </div>
                    </div>

                    <div className="p-5">
                        {error ? (
                            <div className="rounded-[10px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-4">
                                <p className="text-sm text-(--danger)">{error.message}</p>
                            </div>
                        ) : isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-24 bg-(--bg-3) rounded-[12px]"
                                    />
                                ))}
                            </div>
                        ) : !projects?.length ? (
                            <div className="text-center py-10">
                                <p className="text-(--fg) font-medium">No projects yet</p>
                                <p className="text-sm text-(--fg-3) mt-1 max-w-sm mx-auto">
                                    Click Sync to pull projects from Jira.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {projects.map((project) => {
                                    const Visibility = project.isPrivate ? Lock : Globe
                                    return (
                                        <article
                                            key={project.id}
                                            className="rounded-[12px] border border-(--line-2) bg-(--bg-3) p-4 transition-colors hover:border-(--accent-lime)/30"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-(--line-2) bg-(--bg-2) text-(--fg-2)">
                                                    <FolderKanban className="size-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-(--fg) truncate flex-1">
                                                            {project.name}
                                                        </p>
                                                        <span
                                                            className={[
                                                                "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                                                                "font-mono uppercase tracking-wider text-[10px] font-semibold",
                                                                project.isPrivate
                                                                    ? "border border-(--line-2) bg-(--bg-2) text-(--fg-3)"
                                                                    : "border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)",
                                                            ].join(" ")}
                                                        >
                                                            <Visibility className="size-3" />
                                                            {project.isPrivate ? "Private" : "Public"}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                                        {/* <span>
                                                            <span className="text-(--fg-2) normal-case tracking-normal">
                                                                {project.key}
                                                            </span>
                                                        </span> */}
                                                        {project.projectTypeKey ? (
                                                            <span>
                                                        <p>Project Type: {" "}
                                                                <span className="text-(--fg-2) uppercase normal-case tracking-normal">
                                                                    {project.projectTypeKey}
                                                                </span>
                                                        </p>
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    )
}
