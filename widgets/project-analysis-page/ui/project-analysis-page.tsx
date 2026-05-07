"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    X,
    MessageCircle,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Minimize2,
    Loader2,
} from "lucide-react";
import { SiGithub, SiJira, SiSlack, SiDiscord, SiLinear, SiNotion, SiFigma } from "react-icons/si";
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import { toast } from "sonner";
import type { IconType } from "react-icons";

import { getGithubOverview } from "@/entities/github";
import type { GitHubOverview } from "@/types/api-types";
import { useListProjectIntegrations } from "@/entities/project";
import { ExternalProvider } from "@/types/enum";
import { AiChatPanel } from "@/widgets/ai-chat-panel";

type DataSource = {
    id: string;
    name: string;
    icon: IconType | typeof Sparkles;
    color: string;
    bgColor: string;
};

const ALL_SOURCES: DataSource[] = [
    { id: "all", name: "All Sources", icon: Sparkles, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950" },
    { id: "GITHUB", name: "GitHub", icon: SiGithub, color: "text-gray-900 dark:text-gray-100", bgColor: "bg-gray-50 dark:bg-gray-900" },
    { id: "JIRA", name: "Jira", icon: SiJira, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950" },
    { id: "SLACK", name: "Slack", icon: SiSlack, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950" },
    { id: "DISCORD", name: "Discord", icon: SiDiscord, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950" },
    { id: "LINEAR", name: "Linear", icon: SiLinear, color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950" },
    { id: "NOTION", name: "Notion", icon: SiNotion, color: "text-foreground", bgColor: "bg-zinc-50 dark:bg-zinc-900" },
    { id: "FIGMA", name: "Figma", icon: SiFigma, color: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950" },
];

export function ProjectAnalysisPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams<{ organizationId: string; projectId: string }>();
    const organizationId = params.organizationId;
    const projectId = params.projectId;
    const [selectedSource, setSelectedSource] = React.useState<string>("all");
    const [chatOpen, setChatOpen] = React.useState(false);
    const [chatMinimized, setChatMinimized] = React.useState(false);

    const { data: linkedIntegrations, isLoading: integrationsLoading } = useListProjectIntegrations(organizationId, projectId);

    const connectedProviders = React.useMemo(() => {
        const set = new Set<string>();
        for (const link of linkedIntegrations ?? []) {
            const provider = link.provider ?? link.integration?.type;
            const status = link.integrationStatus ?? link.integration?.status;
            if (provider && (!status || status === "CONNECTED")) { set.add(provider); }
        }
        return set;
    }, [linkedIntegrations]);

    const visibleSources = React.useMemo(() => {
        return ALL_SOURCES.filter((s) => s.id === "all" || connectedProviders.has(s.id));
    }, [connectedProviders]);

    React.useEffect(() => {
        const source = searchParams.get("source");
        if (source && visibleSources.some((s) => s.id === source)) {
            setSelectedSource(source);
        }
    }, [searchParams, visibleSources]);

    const githubIntegrationId = React.useMemo(() => {
        return (linkedIntegrations ?? []).find(
            (l) => (l.provider ?? l.integration?.type) === ExternalProvider.GITHUB
                && ((l.integrationStatus ?? l.integration?.status) === "CONNECTED" || !(l.integrationStatus ?? l.integration?.status)),
        )?.integrationId;
    }, [linkedIntegrations]);

    const [githubOverview, setGithubOverview] = React.useState<GitHubOverview | null>(null);
    const [isLoadingGithub, setIsLoadingGithub] = React.useState(false);

    React.useEffect(() => {
        if (!githubIntegrationId || !projectId) {
            setGithubOverview(null);
            return;
        }
        setIsLoadingGithub(true);
        // signature: (integrationId, repoFullName?, projectId?) — projectId goes in slot 3, not 2.
        getGithubOverview(githubIntegrationId, undefined, projectId)
            .then((data) => setGithubOverview(data))
            .catch((err) => toast.error("Failed to fetch GitHub overview", {
                description: err instanceof Error ? err.message : "Unknown error",
            }))
            .finally(() => setIsLoadingGithub(false));
    }, [githubIntegrationId, projectId]);

    const handleSourceChange = (id: string) => {
        setSelectedSource(id);
        const next = new URLSearchParams(searchParams);
        next.set("source", id);
        router.replace(`${pathname}?${next.toString()}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Data Source Analysis</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        AI-generated summaries and insights from your connected sources
                    </p>
                </div>
                <Button onClick={() => { setChatOpen(true); setChatMinimized(false); }} className="gap-2">
                    <Sparkles className="size-4" />
                    Ask AI Assistant
                </Button>
            </div>

            {integrationsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : connectedProviders.size === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">No integrations linked yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect at least one provider on the Integrations tab to see analysis here.
                    </p>
                </Card>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {visibleSources.map((source) => {
                            const Icon = source.icon;
                            const active = selectedSource === source.id;
                            return (
                                <button
                                    key={source.id}
                                    onClick={() => handleSourceChange(source.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${active ? `${source.bgColor} border-current` : "bg-background hover:bg-muted"}`}
                                >
                                    <Icon className={`size-4 ${active ? source.color : "text-muted-foreground"}`} />
                                    <span className={`text-sm font-medium ${active ? source.color : "text-foreground"}`}>
                                        {source.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(selectedSource === "all" || selectedSource === "GITHUB") && githubIntegrationId ? (
                            <GithubOverviewCard
                                overview={githubOverview}
                                isLoading={isLoadingGithub}
                                onClick={() => router.push(`${pathname}/github`)}
                            />
                        ) : null}

                        {(selectedSource === "all" || selectedSource !== "GITHUB") &&
                            visibleSources
                                .filter((s) => s.id !== "all" && s.id !== "GITHUB")
                                .filter((s) => selectedSource === "all" || s.id === selectedSource)
                                .map((source) => (
                                    <SourceActivityCard
                                        key={source.id}
                                        source={source}
                                        onClick={() =>
                                            router.push(
                                                `/${organizationId}/projects/${projectId}/events?source=${source.id}`,
                                            )
                                        }
                                    />
                                ))}
                    </div>

                    {selectedSource !== "all" && selectedSource !== "GITHUB" && !connectedProviders.has(selectedSource) ? (
                        <p className="text-center text-sm text-muted-foreground py-6">
                            This provider isn&apos;t connected to this project.
                        </p>
                    ) : null}
                </>
            )}

            {chatOpen ? (
                <div className={`fixed ${chatMinimized ? "bottom-4 right-4" : "bottom-4 right-4 w-96"} z-50 transition-all`}>
                    {chatMinimized ? (
                        <Button
                            onClick={() => setChatMinimized(false)}
                            size="lg"
                            className="rounded-full size-14 shadow-lg"
                        >
                            <MessageCircle className="size-6" />
                        </Button>
                    ) : (
                        <Card className="flex flex-col h-125 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-linear-to-br from-primary to-purple-600 flex items-center justify-center">
                                        <Sparkles className="size-3.5 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-xs">AI Assistant</p>
                                        <p className="text-[10px] text-muted-foreground">Project context</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setChatMinimized(true)}>
                                        <Minimize2 className="size-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setChatOpen(false)}>
                                        <X className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AiChatPanel
                                    scope={{ kind: "project", projectId }}
                                    compact
                                    showConversationList={false}
                                    height="h-full"
                                    className="rounded-none border-0"
                                />
                            </div>
                        </Card>
                    )}
                </div>
            ) : null}
        </div>
    );
}

function GithubOverviewCard({
    overview,
    isLoading,
    onClick,
}: {
    overview: GitHubOverview | null;
    isLoading: boolean;
    onClick: () => void;
}) {
    if (isLoading) {
        return (
            <Card className="p-5 flex items-center justify-center min-h-40">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </Card>
        );
    }
    if (!overview) {
        return (
            <Card className="p-5">
                <h3 className="font-semibold text-sm mb-1">GitHub overview</h3>
                <p className="text-xs text-muted-foreground">No data yet — repo may still be backfilling.</p>
            </Card>
        );
    }

    return (
        <Card
            className="p-5 hover:shadow-xl hover:border-primary/30 transition-all duration-200 border-border/50 cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                        <SiGithub className="size-4 text-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Repository Activity</h3>
                        <p className="text-xs text-muted-foreground">{overview.repo.name} • GitHub</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                    <CheckCircle2 className="size-3 mr-1" /> Live
                </Badge>
            </div>

            {overview.repo.description ? (
                <p className="text-sm text-muted-foreground mb-4">{overview.repo.description}</p>
            ) : null}

            <div className="flex gap-4 mb-4 pb-4 border-b">
                <Stat label="Commits" value={overview.activity.commits} />
                <Stat label="PRs" value={overview.activity.pullRequests} />
                <Stat label="Issues" value={overview.activity.issues} />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>⭐ {overview.repo.stars} stars</span>
                <span>🍴 {overview.repo.forks} forks</span>
                <span>🌿 {overview.repo.defaultBranch}</span>
            </div>
        </Card>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    );
}

/**
 * Clickable per-source card. Routes to the project Events page pre-filtered to this provider,
 * which renders all RawEvents from that source with their AI-generated summaries. Replaces
 * the old "Coming soon" stub — the Events page is the actual per-source surface today.
 */
function SourceActivityCard({ source, onClick }: { source: DataSource; onClick: () => void }) {
    const Icon = source.icon;
    return (
        <Card
            onClick={onClick}
            className="p-5 border-border/50 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${source.bgColor}`}>
                        <Icon className={`size-4 ${source.color}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">{source.name}</h3>
                        <p className="text-xs text-muted-foreground">Source connected</p>
                    </div>
                </div>
                <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                >
                    <CheckCircle2 className="size-3 mr-1" /> Live
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="size-4 text-blue-500" />
                Browse {source.name} events ingested for this project.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                <AlertCircle className="size-3 text-amber-500" />
                Each event includes an AI-generated summary. Click to open the filtered feed.
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-2">
                <Clock className="size-3" /> Source-specific dashboards (like the GitHub one) are rolling out.
            </p>
        </Card>
    );
}
