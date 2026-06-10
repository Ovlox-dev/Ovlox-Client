"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useNangoResources, useSaveNangoResources, type NangoConnection, type NangoResource } from "@/entities/nango";

const PROVIDER_NOUN: Record<string, string> = {
    GITHUB: "repositories", SLACK: "channels", DISCORD: "channels", JIRA: "projects", LINEAR: "teams",
};

/**
 * Per-project picker for which Slack/Discord channels (or Jira projects / Linear teams) Ovlox
 * should bulk-ingest. Selecting a new resource triggers a server-side backfill; the hourly cron
 * keeps it fresh. Additive — only shown for providers that ingest in bulk.
 */
export function NangoResourcePicker({
    organizationId,
    projectId,
    connection,
    open,
    onOpenChange,
}: {
    organizationId: string;
    projectId: string;
    connection: NangoConnection;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const noun = PROVIDER_NOUN[connection.provider ?? ""] ?? "resources";
    const { data: resources, isLoading } = useNangoResources(
        organizationId,
        connection.providerConfigKey,
        connection.connectionId,
        projectId,
        open,
    );
    const save = useSaveNangoResources(organizationId);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Seed the local selection from the server when fresh data arrives — React's documented
    // "adjusting state when props change" pattern (compare against prior value held in state).
    const [seededFrom, setSeededFrom] = useState<NangoResource[] | null>(null);
    if (resources && resources !== seededFrom) {
        setSeededFrom(resources);
        setSelected(new Set(resources.filter((r) => r.selected).map((r) => r.resourceId)));
    }

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const handleSave = () => {
        const picked = (resources ?? []).filter((r) => selected.has(r.resourceId));
        save.mutate(
            {
                providerConfigKey: connection.providerConfigKey,
                connectionId: connection.connectionId,
                projectId,
                resources: picked.map((r) => ({ resourceId: r.resourceId, resourceName: r.resourceName, resourceType: r.resourceType })),
            },
            {
                onSuccess: (r) => {
                    toast.success(
                        r.backfillsEnqueued > 0
                            ? `Saved — importing ${r.backfillsEnqueued} new ${noun}.`
                            : "Selection saved.",
                    );
                    onOpenChange(false);
                },
                onError: () => toast.error("Failed to save selection."),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Select {noun}</DialogTitle>
                    <DialogDescription>
                        Choose the {noun} Ovlox should ingest for this project. New selections are imported automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[50vh] overflow-y-auto space-y-1 py-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) px-1 py-4">
                            <Loader2 className="size-4 animate-spin" /> Loading {noun}…
                        </div>
                    ) : (resources?.length ?? 0) === 0 ? (
                        <p className="text-sm text-(--fg-3) px-1 py-4">No {noun} found on this connection.</p>
                    ) : (
                        (resources ?? []).map((r) => (
                            <label
                                key={r.resourceId}
                                className="flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-(--bg-3) cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    className="size-4 accent-(--accent-lime)"
                                    checked={selected.has(r.resourceId)}
                                    onChange={() => toggle(r.resourceId)}
                                />
                                <span className="text-sm text-(--fg) truncate">{r.resourceName}</span>
                            </label>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={save.isPending || isLoading}>
                        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Save selection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
