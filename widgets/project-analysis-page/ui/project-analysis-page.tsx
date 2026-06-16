"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    Clock,
    FileText,
    Loader2,
} from "lucide-react";
import { SiGithub, SiJira, SiSlack, SiDiscord, SiLinear, SiNotion, SiFigma } from "react-icons/si";
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import type { IconType } from "react-icons";

import { useListProjectIntegrations } from "@/entities/project";

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

    const handleSourceChange = (id: string) => {
        setSelectedSource(id);
        const next = new URLSearchParams(searchParams);
        next.set("source", id);
        router.replace(`${pathname}?${next.toString()}`);
    };

    const activeSource = visibleSources.find((s) => s.id === selectedSource) ?? visibleSources[0];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Data Source Analysis</h1>
                    <p className="text-sm text-(--fg-2) mt-1">
                        AI-generated summaries and insights from your connected sources
                    </p>
                </div>
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

                    <ComingSoonCard source={activeSource} />

                    {selectedSource !== "all" && selectedSource !== "GITHUB" && !connectedProviders.has(selectedSource) ? (
                        <p className="text-center text-sm text-muted-foreground py-6">
                            This provider isn&apos;t connected to this project.
                        </p>
                    ) : null}
                </>
            )}

        </div>
    );
}

function ComingSoonCard({ source }: { source?: DataSource }) {
    const Icon = source?.icon ?? Sparkles;
    const label = source?.id === "all" ? "Data source analysis" : `${source?.name ?? "Source"} analysis`;

    return (
        <Card className="p-8 border-border/50 border-dashed">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className={`p-3 rounded-xl mb-4 ${source?.bgColor ?? "bg-purple-50 dark:bg-purple-950"}`}>
                    <Icon className={`size-6 ${source?.color ?? "text-purple-600"}`} />
                </div>
                <Badge variant="outline" className="text-[10px] mb-3 bg-muted/50">
                    <Clock className="size-3 mr-1" />
                    Coming soon
                </Badge>
                <h3 className="text-lg font-semibold mb-2">{label}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                    AI-generated summaries and cross-source insights for this project are on the way.
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-3">
                    <Sparkles className="size-3.5 text-purple-500" />
                    Your connected sources will appear here once analysis is ready.
                </p>
            </div>
        </Card>
    );
}
