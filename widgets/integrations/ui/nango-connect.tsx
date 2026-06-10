"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plug, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    useNangoConnections,
    useCreateNangoSession,
    useSyncNangoConnections,
    useDeleteNangoConnection,
} from "@/entities/nango";

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
    const { data: connections, isLoading } = useNangoConnections(organizationId, !!organizationId);
    const createSession = useCreateNangoSession(organizationId);
    const sync = useSyncNangoConnections(organizationId);
    const del = useDeleteNangoConnection(organizationId);

    const pollRef = useRef<number | null>(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => () => { if (pollRef.current) { window.clearInterval(pollRef.current); } }, []);

    const handleConnect = async () => {
        try {
            setConnecting(true);
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
                        onSuccess: (r) => {
                            if (r.imported > 0) { toast.success("Connection added."); }
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
                    {(connections ?? []).map((c) => (
                        <div
                            key={c.id}
                            className="flex items-center justify-between rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2"
                        >
                            <div className="text-sm">
                                <span className="font-medium text-(--fg)">{c.provider || c.providerConfigKey}</span>
                                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                                    {c.status}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={del.isPending}
                                onClick={() =>
                                    del.mutate({ providerConfigKey: c.providerConfigKey, connectionId: c.connectionId })
                                }
                            >
                                <X className="size-4" /> Disconnect
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
