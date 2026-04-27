"use client"

import * as React from "react";
import { useSearchParams } from "next/navigation"
import { ChevronDown, Hash, RefreshCcw } from "lucide-react";
import { useGetChannels, useGetDiscordUserGuilds, useSyncChannels } from "@/shared/queries/discord.queries"
import { Button } from "@/components/ui/button";
import { getBotInstallUrlForGuild } from "@/shared/api/integration-discord";
import { toast } from "sonner";
import { formatAuthErrorMessage } from "@/features/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


export default function DiscordIntegrationPage() {
    const searchParams = useSearchParams();
    const integrationId = searchParams?.get("integrationId") ?? ""
    const { data, isLoading, error } = useGetDiscordUserGuilds(integrationId)
    const syncGuildsMutation = useSyncChannels()
    const [expandedGuildId, setExpandedGuildId] = React.useState<string | null>(null);
    const [syncingGuildId, setSyncingGuildId] = React.useState<string | null>(null);

    const handleBotInstall = async (guildId: string) => {
        try {
            const res = await getBotInstallUrlForGuild(integrationId, guildId)
            if (res?.url) {
                window.open(res.url, "_blank", "noopener,noreferrer");
            }
        }
        catch (error) {
            toast.error(formatAuthErrorMessage(error));
        }
    }

    const handleSyncGuildChannels = React.useCallback((guildId: string) => {
        setSyncingGuildId(guildId);
        syncGuildsMutation.mutate(
            { integrationId, guildId },
            {
                onSuccess: () => {
                    toast.success("Synced channels");
                    setSyncingGuildId(null);
                },
                onError: (error) => {
                    toast.error(formatAuthErrorMessage(error));
                    setSyncingGuildId(null);
                },
            }
        );
    }, [integrationId, syncGuildsMutation]);

    return (
        <div className="space-y-6">
            <PageTitle
                title="Discord Integration"
                description="Connect Discord and manage channels."
            />

            <Card className="rounded-2xl border-border bg-card">
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-base font-semibold">Servers</div>
                            <p className="text-sm text-muted-foreground">
                                Sync your servers, then expand a server to view its channels.
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {formatAuthErrorMessage(error)}
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="border-border/60">
                                    <CardContent className="space-y-3 p-4">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-56" />
                                        <Skeleton className="h-9 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : data?.length ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {data.map((guild) => (
                                <GuildCard
                                    key={guild.id}
                                    integrationId={integrationId}
                                    guild={guild}
                                    expanded={expandedGuildId === guild.id}
                                    onToggleExpanded={() =>
                                        setExpandedGuildId((prev) => (prev === guild.id ? null : guild.id))
                                    }
                                    onInstallBot={() => handleBotInstall(guild.id)}
                                    onSyncChannels={() => handleSyncGuildChannels(guild.id)}
                                    syncingChannels={syncingGuildId === guild.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No Discord servers found.
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}

function GuildCard(props: {
    integrationId: string;
    guild: { id: string; name: string; botInstalled: boolean };
    expanded: boolean;
    onToggleExpanded: () => void;
    onInstallBot: () => void;
    onSyncChannels: () => void;
    syncingChannels: boolean;
}) {
    const { data: channels, isLoading } = useGetChannels(
        props.integrationId,
        props.expanded ? props.guild.id : undefined
    );

    return (
        <Card>
            <CardContent className="">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{props.guild.name}</p>
                            {props.guild.botInstalled ? (
                                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10">
                                    Bot installed
                                </Badge>
                            ) : (
                                <Badge variant="secondary">Bot not installed</Badge>
                            )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">ID: {props.guild.id}</p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={props.onToggleExpanded}
                        aria-label={props.expanded ? "Collapse channels" : "Expand channels"}
                    >
                        <ChevronDown className={cn("size-4 transition-transform", props.expanded ? "rotate-180" : "")} />
                    </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {props.guild.botInstalled ? (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                className="gap-2"
                                onClick={props.onSyncChannels}
                                disabled={props.syncingChannels}
                            >
                                <RefreshCcw className={cn("size-4", props.syncingChannels ? "animate-spin" : "")} />
                                {props.syncingChannels ? "Syncing..." : "Sync channels"}
                            </Button>
                            <Button type="button" onClick={props.onToggleExpanded}>
                                {props.expanded ? "Hide channels" : "View channels"}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" onClick={props.onInstallBot}>
                            Install bot
                        </Button>
                    )}
                </div>

                {props.expanded ? (
                    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">Channels</p>
                            <Badge variant="secondary">{channels?.length ?? 0}</Badge>
                        </div>

                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : !channels?.length ? (
                            <div className="text-sm text-muted-foreground">
                                No channels found. Try syncing channels.
                            </div>
                        ) : (
                            <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                {channels.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{c.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{c.id}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Hash className="size-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

