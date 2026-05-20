"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MoreVertical, Loader2 } from 'lucide-react';
import { RiAppsFill } from 'react-icons/ri';
import { IoLogoGithub } from 'react-icons/io5';
import { SiSlack, SiJira, SiLinear, SiNotion, SiFigma, SiDiscord } from 'react-icons/si';
import type { IconType } from 'react-icons';

import { useGetTimeline, useListProjects } from '@/entities/project';

type FilterKey = "all" | "GITHUB" | "SLACK" | "JIRA" | "LINEAR" | "DISCORD" | "NOTION" | "FIGMA";
type TimeKey = "all" | "today" | "week";

const PROVIDER_ICONS: Record<string, IconType> = {
    GITHUB: IoLogoGithub,
    SLACK: SiSlack,
    JIRA: SiJira,
    LINEAR: SiLinear,
    NOTION: SiNotion,
    FIGMA: SiFigma,
    DISCORD: SiDiscord,
};

function relative(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) { return "just now"; }
    if (m < 60) { return `${m}m ago`; }
    const h = Math.floor(m / 60);
    if (h < 24) { return `${h}h ago`; }
    return `${Math.floor(h / 24)}d ago`;
}

const TeamActivity = () => {
    const { organizationId } = useParams<{ organizationId: string }>();
    const [filter, setFilter] = React.useState<FilterKey>("all");
    const [timeFilter, setTimeFilter] = React.useState<TimeKey>("week");

    const { data: projectsResponse } = useListProjects(organizationId, { limit: 1, sort: "-updatedAt" });
    const firstProject = projectsResponse?.data?.[0];
    const projectId = firstProject?.id ?? "";

    const since = React.useMemo(() => {
        const now = Date.now();
        if (timeFilter === "today") { return new Date(now - 24 * 60 * 60 * 1000).toISOString(); }
        if (timeFilter === "week") { return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); }
        return undefined;
    }, [timeFilter]);

    const { data: timelineResponse, isLoading } = useGetTimeline(organizationId, projectId, {
        since,
        limit: 30,
    });

    const entries = React.useMemo(() => {
        const all = timelineResponse?.entries ?? [];
        if (filter === "all") { return all; }
        return all.filter((e) => {
            const provider = (e.metadata?.provider as string | undefined) ?? (e.metadata?.source as string | undefined);
            return provider === filter;
        });
    }, [timelineResponse, filter]);

    return (
        <div>
            <Card className="border-[0.5px] border-border bg-card rounded-2xl">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-2xl font-semibold text-text">
                        Team Activity
                    </CardTitle>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)} className="w-full sm:w-auto">
                        <TabsList className="border border-border bg-accent-contrast p-0.5 rounded-full">
                            <TabsTrigger value="all" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <RiAppsFill /> All
                            </TabsTrigger>
                            <TabsTrigger value="GITHUB" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <IoLogoGithub /> Github
                            </TabsTrigger>
                            <TabsTrigger value="SLACK" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <SiSlack /> Slack
                            </TabsTrigger>
                            <TabsTrigger value="JIRA" className="cursor-pointer text-base px-2 py-1 rounded-full text-muted dark:data-[state=active]:bg-accent dark:data-[state=active]:text-background">
                                <SiJira /> Jira
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeKey)}>
                            <SelectTrigger
                                size="sm"
                                className="w-[90px] rounded-full border-border"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This week</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent>
                    {!projectId ? (
                        <p className="text-sm text-muted py-8 text-center">No projects yet.</p>
                    ) : isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-5 animate-spin text-muted" />
                        </div>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-muted py-8 text-center">
                            No activity in this range
                            {firstProject?.name ? ` for ${firstProject.name}` : ""}.
                        </p>
                    ) : (
                        <ul className="space-y-4">
                            {entries.slice(0, 8).map((e) => {
                                const provider =
                                    (e.metadata?.provider as string | undefined) ??
                                    (e.metadata?.source as string | undefined);
                                const Icon = provider ? PROVIDER_ICONS[provider] : RiAppsFill;
                                return (
                                    <li
                                        key={e.id}
                                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon className="size-8 shrink-0 text-text" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{e.title}</p>
                                                {e.summary ? (
                                                    <div className="text-xs font-normal text-muted truncate">
                                                        {e.summary}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                        <span className="justify-self-center whitespace-nowrap text-sm font-normal text-muted">
                                            {relative(e.occurredAt)}
                                        </span>
                                        <div className="flex items-center justify-end gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="shrink-0 border-[0.5px] border-accent bg-background text-xs text-accent"
                                            >
                                                View Details
                                            </Button>
                                            <Button size="sm" variant="ghost">
                                                <MoreVertical className="text-muted" />
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeamActivity;
