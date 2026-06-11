"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plug, X, ListChecks, RefreshCw } from "lucide-react";
import type { IconType } from "react-icons";
import { IoLogoGithub } from "react-icons/io5";
import { SiDiscord, SiJira, SiLinear, SiSlack, SiNotion, SiFigma } from "react-icons/si";

import { Button } from "@/components/ui/button";
import {
    useNangoConnections,
    useCreateNangoSession,
    useSyncNangoConnections,
    useDeleteNangoConnection,
    useReindexNangoConnection,
    useSelectedNangoResources,
    type NangoConnection,
} from "@/entities/nango";
import { NangoResourcePicker } from "./nango-resource-picker";

/** Providers where you pick resources after connecting: repos (GitHub), channels (Slack/Discord),
 *  projects (Jira), teams (Linear). */
const SELECTABLE_PROVIDERS = new Set(["GITHUB", "SLACK", "DISCORD", "JIRA", "LINEAR"]);

const PROVIDER_ICON: Record<string, IconType> = {
    GITHUB: IoLogoGithub, SLACK: SiSlack, DISCORD: SiDiscord, JIRA: SiJira, LINEAR: SiLinear, NOTION: SiNotion, FIGMA: SiFigma,
};

const SELECT_LABEL: Record<string, string> = {
    GITHUB: "Repos", SLACK: "Channels", DISCORD: "Channels", JIRA: "Projects", LINEAR: "Teams",
};

function errorMessage(e: unknown, fallback: string): string {
    const withResponse = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
    return withResponse?.response?.data?.error?.message || withResponse?.message || fallback;
}

/**
 * Unified "Connect via Nango" panel. Additive to the existing per-provider integration cards:
 * creates a Connect session and opens the backend-provided `connectUrl` in a popup; once the popup
 * closes it reconciles connections (sync is a fallback in case the auth webhook was missed). Lists
 * the org's current Nango connections with a disconnect action.
 */
export function NangoConnect({ organizationId, projectId }: { organizationId: string; projectId?: string }) {
    const { data: connections, isLoading, refetch } = useNangoConnections(organizationId, !!organizationId);
    const createSession = useCreateNangoSession(organizationId);
    const sync = useSyncNangoConnections(organizationId);
    const del = useDeleteNangoConnection(organizationId);
    const reindex = useReindexNangoConnection(organizationId);

    const pollRef = useRef<number | null>(null);
    // Connection ids present before a connect attempt — used to detect the newly-added one so we can
    // immediately prompt for which data sources to ingest (project-level connect flow).
    const preConnectIds = useRef<Set<string>>(new Set());
    const [connecting, setConnecting] = useState(false);
    const [picker, setPicker] = useState<NangoConnection | null>(null);

    useEffect(() => () => { if (pollRef.current) { window.clearInterval(pollRef.current); } }, []);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            // Snapshot existing connections so we can spot the new one after connecting.
            preConnectIds.current = new Set((connections ?? []).map((c) => c.connectionId));
            const { connectUrl } = await createSession.mutateAsync(projectId ? { projectId } : {});
            const popup = window.open(connectUrl, "nango-connect", "width=520,height=720");
            if (!popup) {
                toast.error("Popup blocked — allow popups for this site and try again.");
                setConnecting(false);
                return;
            }
            // When the popup closes, reconcile. The auth webhook usually records the connection first;
            // the sync call is the fallback for a missed webhook.
            if (pollRef.current) { window.clearInterval(pollRef.current); }
            pollRef.current = window.setInterval(() => {
                if (popup.closed) {
                    if (pollRef.current) { window.clearInterval(pollRef.current); }
                    pollRef.current = null;
                    setConnecting(false);
                    sync.mutate(undefined, {
                        onSuccess: async (r) => {
                            if (r.imported > 0) { toast.success("Connection added."); }
                            // Project-level connect → immediately ask which data sources (repos /
                            // channels / projects / teams) to ingest for this project.
                            if (projectId) {
                                const fresh = await refetch();
                                const added = (fresh.data ?? []).find(
                                    (c) => !preConnectIds.current.has(c.connectionId) && SELECTABLE_PROVIDERS.has(c.provider ?? ""),
                                );
                                if (added) { setPicker(added); }
                            }
                        },
                    });
                }
            }, 1000);
        } catch (e: unknown) {
            toast.error(errorMessage(e, "Failed to start connection"));
            setConnecting(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-(--fg)">Connect via Nango</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">unified</span>
            </div>

            <div className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5 space-y-4">
                <p className="text-sm text-(--fg-2)">
                    Connect a tool through Nango — you authorize in a popup, and everything after is automatic.
                </p>

                <div className="flex items-center gap-2">
                    <Button onClick={handleConnect} disabled={connecting || createSession.isPending}>
                        {connecting || createSession.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plug className="size-4" />
                        )}
                        Connect a tool
                    </Button>
                    <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
                        {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Refresh
                    </Button>
                </div>

                <div className="space-y-2">
                    {isLoading ? <p className="text-xs text-(--fg-3)">Loading connections…</p> : null}
                    {!isLoading && (connections?.length ?? 0) === 0 ? (
                        <p className="text-xs text-(--fg-3)">No Nango connections yet.</p>
                    ) : null}
                    {(connections ?? []).map((c) => {
                        const Icon = PROVIDER_ICON[c.provider ?? ""] ?? Plug;
                        return (
                        <div
                            key={c.id}
                            className="rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className="size-5 shrink-0 text-(--fg-2)" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-(--fg)">{c.provider || c.providerConfigKey}</span>
                                        {(c.metadata as { accountName?: string } | null)?.accountName ? (
                                            <span className="text-sm text-(--fg-2) truncate">
                                                {(c.metadata as { accountName?: string }).accountName}
                                            </span>
                                        ) : null}
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">{c.status}</span>
                                    </div>
                                    <span className="block font-mono text-[10px] text-(--fg-3) truncate">
                                        {c.providerConfigKey} · {c.connectionId?.slice(0, 8)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {projectId && SELECTABLE_PROVIDERS.has(c.provider ?? "") ? (
                                    <Button variant="ghost" size="sm" onClick={() => setPicker(c)}>
                                        <ListChecks className="size-4" /> {SELECT_LABEL[c.provider ?? ""] ?? "Select"}
                                    </Button>
                                ) : null}
                                {projectId && c.provider === "GITHUB" ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={reindex.isPending}
                                        onClick={() =>
                                            reindex.mutate(
                                                { providerConfigKey: c.providerConfigKey, connectionId: c.connectionId, projectId },
                                                {
                                                    onSuccess: (r) =>
                                                        toast.success(r.repos > 0 ? `Re-indexing ${r.repos} repo(s)…` : "No selected repos to re-index."),
                                                    onError: () => toast.error("Failed to start re-index."),
                                                },
                                            )
                                        }
                                    >
                                        {reindex.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Re-index
                                    </Button>
                                ) : null}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={del.isPending}
                                    onClick={() => {
                                        // Connection-level delete is org-wide: it removes this connection from
                                        // EVERY project. To drop a single repo/channel from just this project,
                                        // use the per-resource remove in the "Select" picker instead.
                                        if (
                                            !window.confirm(
                                                `Disconnect ${c.provider || c.providerConfigKey}? This removes the whole connection from ALL projects in the org. To remove a single ${SELECT_LABEL[c.provider ?? ""]?.toLowerCase().replace(/s$/, "") ?? "resource"} from just this project, use “Select” instead.`,
                                            )
                                        ) {
                                            return;
                                        }
                                        del.mutate({ providerConfigKey: c.providerConfigKey, connectionId: c.connectionId });
                                    }}
                                >
                                    <X className="size-4" /> Disconnect
                                </Button>
                            </div>
                          </div>
                          {projectId && SELECTABLE_PROVIDERS.has(c.provider ?? "") ? (
                              <ConnectedResources
                                  organizationId={organizationId}
                                  projectId={projectId}
                                  connection={c}
                                  noun={SELECT_LABEL[c.provider ?? ""]?.toLowerCase() ?? "resources"}
                              />
                          ) : null}
                        </div>
                        );
                    })}
                </div>
            </div>

            {projectId && picker ? (
                <NangoResourcePicker
                    organizationId={organizationId}
                    projectId={projectId}
                    connection={picker}
                    open={!!picker}
                    onOpenChange={(o) => { if (!o) { setPicker(null); } }}
                />
            ) : null}
        </section>
    );
}

/** Chips showing which resources (repos/channels/teams) this connection ingests for THIS project. */
function ConnectedResources({
    organizationId, projectId, connection, noun,
}: {
    organizationId: string;
    projectId: string;
    connection: NangoConnection;
    noun: string;
}) {
    const { data, isPending } = useSelectedNangoResources(
        organizationId,
        connection.providerConfigKey,
        connection.connectionId,
        projectId,
    );
    if (isPending) { return null; }
    if (!data || data.length === 0) {
        return <p className="text-[11px] text-(--fg-3)">No {noun} selected for this project yet — click “Select”.</p>;
    }
    return (
        <div className="flex flex-wrap gap-1">
            {data.map((r) => (
                <span
                    key={r.resourceId}
                    title={r.resourceId}
                    className="inline-flex items-center rounded-full border border-(--line) bg-(--bg-2) px-2 py-0.5 text-[11px] text-(--fg-2)"
                >
                    {r.resourceName || r.resourceId}
                </span>
            ))}
        </div>
    );
}
