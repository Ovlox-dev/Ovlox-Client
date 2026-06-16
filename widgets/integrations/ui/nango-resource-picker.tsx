"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, ChevronRight, ChevronDown, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useNangoResources,
    useSaveNangoResources,
    useRemoveNangoResource,
    useRepoBranches,
    type NangoConnection,
    type NangoResource,
} from "@/entities/nango";

const PROVIDER_NOUN: Record<string, string> = {
    GITHUB: "repositories", SLACK: "channels", DISCORD: "channels", JIRA: "projects", LINEAR: "teams",
};

function errorMessage(e: unknown, fallback: string): string {
    const withResponse = e as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
    return withResponse?.response?.data?.error?.message || withResponse?.response?.data?.message || withResponse?.message || fallback;
}

/**
 * Per-project picker for which GitHub repos / Slack-Discord channels / Jira projects / Linear teams
 * Ovlox should ingest. Selecting a new resource triggers a server-side backfill; the hourly cron
 * keeps it fresh. For GitHub, each repo can additionally track multiple branches ("environments").
 * Already-ingested resources can be removed from this project (data + selection) without touching
 * the connection. Additive — does not replace the existing flow.
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
    const isGithub = (connection.provider ?? "") === "GITHUB";
    const noun = PROVIDER_NOUN[connection.provider ?? ""] ?? "resources";
    const { data: resources, isLoading, isError, error, refetch } = useNangoResources(
        organizationId,
        connection.providerConfigKey,
        connection.connectionId,
        projectId,
        open,
    );
    const save = useSaveNangoResources(organizationId);
    const remove = useRemoveNangoResource(organizationId);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    // repoId → explicit branch selection. Undefined means "default branch only" (derived UI).
    const [branchSel, setBranchSel] = useState<Record<string, string[]>>({});

    // Seed the local selection from the server when fresh data arrives — React's documented
    // "adjusting state when props change" pattern (compare against prior value held in state).
    const [seededFrom, setSeededFrom] = useState<NangoResource[] | null>(null);
    if (resources && resources !== seededFrom) {
        setSeededFrom(resources);
        setSelected(new Set(resources.filter((r) => r.selected).map((r) => r.resourceId)));
        setBranchSel({});
    }

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const setRepoBranches = (repoId: string, branches: string[]) => {
        setBranchSel((prev) => ({ ...prev, [repoId]: branches }));
    };

    const handleRemove = (r: NangoResource) => {
        if (!window.confirm(`Remove "${r.resourceName}" from this project? Its imported data is deleted; the connection stays connected.`)) {
            return;
        }
        remove.mutate(
            { providerConfigKey: connection.providerConfigKey, connectionId: connection.connectionId, projectId, resourceId: r.resourceId },
            {
                onSuccess: () => { toast.success(`Removed ${r.resourceName} from this project.`); void refetch(); },
                onError: (e) => toast.error(errorMessage(e, "Failed to remove.")),
            },
        );
    };

    const handleSave = () => {
        const picked = (resources ?? []).filter((r) => selected.has(r.resourceId));
        save.mutate(
            {
                providerConfigKey: connection.providerConfigKey,
                connectionId: connection.connectionId,
                projectId,
                resources: picked.map((r) => ({
                    resourceId: r.resourceId,
                    resourceName: r.resourceName,
                    resourceType: r.resourceType,
                    ...(isGithub ? { selectedBranches: branchSel[r.resourceId] ?? [] } : {}),
                })),
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
                        {isGithub ? " Pick which branches (environments) to track per repo." : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[50vh] overflow-y-auto space-y-1 py-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-(--fg-3) px-1 py-4">
                            <Loader2 className="size-4 animate-spin" /> Loading {noun}…
                        </div>
                    ) : isError ? (
                        <div className="px-1 py-4 space-y-2">
                            <p className="text-sm text-(--danger)">
                                Couldn’t load {noun}: {errorMessage(error, "the provider call failed")}.
                            </p>
                            <Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
                        </div>
                    ) : (resources?.length ?? 0) === 0 ? (
                        <p className="text-sm text-(--fg-3) px-1 py-4">No {noun} found on this connection.</p>
                    ) : (
                        (resources ?? []).map((r) =>
                            isGithub ? (
                                <GithubRepoRow
                                    key={r.resourceId}
                                    organizationId={organizationId}
                                    connection={connection}
                                    resource={r}
                                    checked={selected.has(r.resourceId)}
                                    onToggle={() => toggle(r.resourceId)}
                                    branchSel={branchSel[r.resourceId]}
                                    onBranchSel={(branches) => setRepoBranches(r.resourceId, branches)}
                                    onRemove={r.selected ? () => handleRemove(r) : undefined}
                                    removing={remove.isPending}
                                />
                            ) : (
                                <ResourceRow
                                    key={r.resourceId}
                                    resource={r}
                                    checked={selected.has(r.resourceId)}
                                    onToggle={() => toggle(r.resourceId)}
                                    onRemove={r.selected ? () => handleRemove(r) : undefined}
                                    removing={remove.isPending}
                                />
                            ),
                        )
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

/** A non-GitHub resource (channel / project / team): checkbox + optional remove. */
function ResourceRow({
    resource, checked, onToggle, onRemove, removing,
}: {
    resource: NangoResource;
    checked: boolean;
    onToggle: () => void;
    onRemove?: () => void;
    removing: boolean;
}) {
    return (
        <div className="flex items-center gap-2 rounded-[8px] px-2 py-2 hover:bg-(--bg-3)">
            <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                <input type="checkbox" className="size-4 accent-(--accent-lime)" checked={checked} onChange={onToggle} />
                <span className="text-sm text-(--fg) truncate">{resource.resourceName}</span>
            </label>
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={removing}
                    title="Remove from this project"
                    className="text-(--fg-3) hover:text-(--danger) shrink-0 disabled:opacity-50"
                >
                    <Trash2 className="size-4" />
                </button>
            ) : null}
        </div>
    );
}

/** A GitHub repo row: checkbox + expandable branch (environment) multiselect + optional remove. */
function GithubRepoRow({
    organizationId, connection, resource, checked, onToggle, branchSel, onBranchSel, onRemove, removing,
}: {
    organizationId: string;
    connection: NangoConnection;
    resource: NangoResource;
    checked: boolean;
    onToggle: () => void;
    branchSel: string[] | undefined;
    onBranchSel: (branches: string[]) => void;
    onRemove?: () => void;
    removing: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const { data: branches, isLoading, isError } = useRepoBranches(
        organizationId,
        connection.providerConfigKey,
        connection.connectionId,
        expanded ? resource.resourceId : null,
    );

    // Derived: when the user hasn't explicitly touched branches, the default branch is implied.
    const isBranchChecked = (name: string, isDefault: boolean) =>
        branchSel ? branchSel.includes(name) : isDefault;

    const toggleBranch = (name: string) => {
        const current = branchSel ?? (branches ?? []).filter((b) => b.isDefault).map((b) => b.name);
        const next = current.includes(name) ? current.filter((b) => b !== name) : [...current, name];
        onBranchSel(next);
    };

    return (
        <div className="rounded-[8px] hover:bg-(--bg-3)">
            <div className="flex items-center gap-2 px-2 py-2">
                <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                    <input type="checkbox" className="size-4 accent-(--accent-lime)" checked={checked} onChange={onToggle} />
                    <span className="text-sm text-(--fg) truncate">{resource.resourceName}</span>
                </label>
                {checked ? (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        title="Choose which branches (environments) to track"
                        className="flex items-center gap-1 rounded-[6px] border border-(--line) px-1.5 py-0.5 text-[11px] text-(--fg-2) hover:bg-(--bg-2) shrink-0"
                    >
                        <GitBranch className="size-3.5" /> Branches
                        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                ) : null}
                {onRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={removing}
                        title="Remove from this project"
                        className="text-(--fg-3) hover:text-(--danger) shrink-0 disabled:opacity-50"
                    >
                        <Trash2 className="size-4" />
                    </button>
                ) : null}
            </div>

            {checked && expanded ? (
                <div className="pl-9 pr-2 pb-2 space-y-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-(--fg-3) py-1">
                            <Loader2 className="size-3 animate-spin" /> Loading branches…
                        </div>
                    ) : isError ? (
                        <p className="text-[11px] text-(--danger) py-1">Couldn’t load branches.</p>
                    ) : (branches?.length ?? 0) === 0 ? (
                        <p className="text-[11px] text-(--fg-3) py-1">No branches found.</p>
                    ) : (
                        (branches ?? []).map((b) => (
                            <label key={b.name} className="flex items-center gap-2 cursor-pointer py-0.5">
                                <input
                                    type="checkbox"
                                    className="size-3.5 accent-(--accent-lime)"
                                    checked={isBranchChecked(b.name, b.isDefault)}
                                    onChange={() => toggleBranch(b.name)}
                                />
                                <span className="text-[12px] text-(--fg-2) truncate">{b.name}</span>
                                {b.isDefault ? (
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-(--fg-3)">default</span>
                                ) : null}
                            </label>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
