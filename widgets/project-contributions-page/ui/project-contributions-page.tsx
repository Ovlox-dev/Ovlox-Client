"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Users, GitCommit, GitPullRequest, MessageSquare, CheckSquare2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetContributions } from "@/entities/project";
import { useApiError } from "@/hooks/useApiError";

type Range = "week" | "month" | "quarter" | "all";
const RANGE_DAYS: Record<Range, number | null> = { week: 7, month: 30, quarter: 90, all: null };

export function ProjectContributionsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [range, setRange] = React.useState<Range>("month");

    const sinceISO = React.useMemo(() => {
        const days = RANGE_DAYS[range];
        if (!days) return undefined;
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString();
    }, [range]);

    const { data, isPending, error, refetch } = useGetContributions(organizationId, projectId, {
        since: sinceISO,
    });
    useApiError(error);

    const contributors = data?.contributors ?? [];

    const totalEvents = data?.totalEvents ?? 0;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2 text-(--fg)">
                        <Users className="size-6 text-(--accent-lime)" /> Contributions
                    </h1>
                    <p className="text-(--fg-2) text-sm">
                        Activity across all branches. Squash-merged PRs are unfolded so original commit authors get credit.
                    </p>
                    {totalEvents > 0 ? (
                        <p className="text-xs font-mono uppercase tracking-wider text-(--fg-3) mt-2">
                            {totalEvents.toLocaleString()} events · {contributors.length} contributors
                        </p>
                    ) : null}
                </div>
                <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                    <SelectTrigger className="w-full sm:w-44">
                        <Calendar className="size-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="quarter">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                </Select>
            </header>

            {isPending ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-(--fg-3)" />
                </div>
            ) : error ? (
                <Card className="p-6 flex flex-col items-center gap-3 bg-(--bg-2) border-(--line-2)">
                    <AlertCircle className="size-6 text-(--danger)" />
                    <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </Card>
            ) : contributors.length === 0 ? (
                <Card className="p-12 flex flex-col items-center gap-3 bg-(--bg-2) border-(--line-2)">
                    <Users className="size-8 text-(--fg-3)" />
                    <p className="text-sm text-(--fg-2)">No contributions in this range.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {contributors.map((c, idx) => {
                        const total = c.commits + c.pullRequests + c.messages + c.tasks + c.other;
                        const initials = (c.name || c.email || "?").slice(0, 2).toUpperCase();
                        const isAnonymous = !c.name && !c.email;
                        return (
                            <Card key={c.key} className="p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap bg-(--bg-2) border-(--line-2) hover:border-(--accent-lime)/30 transition-colors">
                                <span className="text-xs font-mono text-(--fg-3) w-6 shrink-0">#{idx + 1}</span>
                                <Avatar className="size-9 shrink-0">
                                    <AvatarFallback className="bg-(--bg-3) text-(--fg-2) text-xs">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-(--fg)">{c.name || c.email || "Anonymous"}</p>
                                    {c.email && c.name && (
                                        <p className="text-xs text-(--fg-3) truncate">{c.email}</p>
                                    )}
                                    {isAnonymous ? (
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                                            unattributed identity
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-(--fg-3) flex-wrap">
                                    <Stat icon={GitCommit} label="commits" value={c.commits} />
                                    <Stat icon={GitPullRequest} label="PRs" value={c.pullRequests} />
                                    <Stat icon={MessageSquare} label="msgs" value={c.messages} />
                                    <Stat icon={CheckSquare2} label="tasks" value={c.tasks} />
                                    <span className="font-semibold text-(--accent-lime) tabular-nums">{total} total</span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
    if (value === 0) return null;
    return (
        <span className="flex items-center gap-1">
            <Icon className="size-3.5" />
            {value} {label}
        </span>
    );
}
