"use client";

import * as React from "react";
import { ChevronRight, Folder, FolderOpen, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FileTreeFile {
    id: string;
    path: string;
    language?: string | null;
    riskScore?: number | null;
}

interface DirNode {
    name: string;
    fullPath: string;
    children: Map<string, DirNode>;
    files: FileTreeFile[];
    fileCountSelf: number;
    fileCountTree: number;
    /** Sum of risk scores in this subtree — used to surface the highest-risk folders. */
    maxRiskInTree: number;
}

function emptyDir(name: string, fullPath: string): DirNode {
    return {
        name,
        fullPath,
        children: new Map(),
        files: [],
        fileCountSelf: 0,
        fileCountTree: 0,
        maxRiskInTree: 0,
    };
}

function buildTree(files: FileTreeFile[]): DirNode {
    const root = emptyDir("", "");
    for (const file of files) {
        const parts = file.path.split("/").filter(Boolean);
        const fileName = parts.pop() ?? file.path;
        let cursor = root;
        const segments: string[] = [];
        for (const segment of parts) {
            segments.push(segment);
            const fullPath = segments.join("/");
            if (!cursor.children.has(segment)) {
                cursor.children.set(segment, emptyDir(segment, fullPath));
            }
            cursor = cursor.children.get(segment)!;
        }
        cursor.files.push({ ...file, path: fileName });
        cursor.fileCountSelf++;
    }

    const rollup = (node: DirNode): { count: number; maxRisk: number } => {
        let count = node.fileCountSelf;
        let maxRisk = node.files.reduce((max, f) => Math.max(max, f.riskScore ?? 0), 0);
        for (const child of node.children.values()) {
            const sub = rollup(child);
            count += sub.count;
            maxRisk = Math.max(maxRisk, sub.maxRisk);
        }
        node.fileCountTree = count;
        node.maxRiskInTree = maxRisk;
        return { count, maxRisk };
    };
    rollup(root);

    return root;
}

function filterTree(node: DirNode, query: string): DirNode | null {
    if (!query) return node;

    const matchesQuery = (text: string) => text.toLowerCase().includes(query.toLowerCase());

    const matchedFiles = node.files.filter((f) => matchesQuery(f.path));

    const filteredChildren: Map<string, DirNode> = new Map();
    for (const [k, child] of node.children) {
        const filtered = filterTree(child, query);
        if (filtered) filteredChildren.set(k, filtered);
    }

    if (matchedFiles.length === 0 && filteredChildren.size === 0 && !matchesQuery(node.fullPath)) {
        return null;
    }

    const next: DirNode = {
        ...node,
        children: filteredChildren,
        files: matchedFiles,
        fileCountSelf: matchedFiles.length,
    };

    let count = matchedFiles.length;
    let maxRisk = matchedFiles.reduce((max, f) => Math.max(max, f.riskScore ?? 0), 0);
    for (const child of filteredChildren.values()) {
        count += child.fileCountTree;
        maxRisk = Math.max(maxRisk, child.maxRiskInTree);
    }
    next.fileCountTree = count;
    next.maxRiskInTree = maxRisk;
    return next;
}

function riskBadgeClass(score: number): string {
    if (score >= 80) return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    if (score >= 60) return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    if (score >= 40) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    return "bg-muted/50 text-(--fg-2) border-transparent";
}

interface FileTreeProps {
    files: FileTreeFile[];
    activeFileId: string | null;
    onSelect: (fileId: string) => void;
    /** Search query applied across paths (case-insensitive). */
    query: string;
}

export function FileTree({ files, activeFileId, onSelect, query }: FileTreeProps) {
    const root = React.useMemo(() => buildTree(files), [files]);
    const filtered = React.useMemo(() => filterTree(root, query.trim()) ?? root, [root, query]);

    if (files.length === 0) {
        return <p className="text-xs text-(--fg-2) p-3">No files indexed yet.</p>;
    }

    if (filtered.fileCountTree === 0) {
        return <p className="text-xs text-(--fg-2) p-3">No files match &quot;{query}&quot;.</p>;
    }

    return (
        <div className="text-xs font-mono">
            {Array.from(filtered.children.values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((dir) => (
                    <DirRow
                        key={dir.fullPath}
                        node={dir}
                        depth={0}
                        activeFileId={activeFileId}
                        onSelect={onSelect}
                        forceOpen={!!query}
                    />
                ))}
            {filtered.files
                .slice()
                .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0) || a.path.localeCompare(b.path))
                .map((file) => (
                    <FileRow
                        key={file.id}
                        file={file}
                        depth={0}
                        activeFileId={activeFileId}
                        onSelect={onSelect}
                    />
                ))}
        </div>
    );
}

function DirRow({
    node,
    depth,
    activeFileId,
    onSelect,
    forceOpen,
}: {
    node: DirNode;
    depth: number;
    activeFileId: string | null;
    onSelect: (fileId: string) => void;
    forceOpen: boolean;
}) {
    const [open, setOpen] = React.useState(depth === 0);
    const isOpen = forceOpen || open;
    const hasContent = node.children.size > 0 || node.files.length > 0;
    const FolderIcon = isOpen ? FolderOpen : Folder;

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors text-left",
                )}
                style={{ paddingLeft: 8 + depth * 12 }}
            >
                <ChevronRight
                    className={cn(
                        "size-3 text-(--fg-2) transition-transform shrink-0",
                        isOpen && "rotate-90",
                    )}
                />
                <FolderIcon className="size-3.5 text-blue-500/80 shrink-0" />
                <span className="truncate">{node.name}</span>
                <span className="ml-auto text-[10px] text-(--fg-2) shrink-0">
                    {node.fileCountTree}
                </span>
                {node.maxRiskInTree >= 40 ? (
                    <span
                        className={cn(
                            "shrink-0 size-1.5 rounded-full",
                            node.maxRiskInTree >= 80
                                ? "bg-red-500"
                                : node.maxRiskInTree >= 60
                                    ? "bg-orange-500"
                                    : "bg-yellow-500",
                        )}
                        aria-hidden
                    />
                ) : null}
            </button>
            {isOpen && hasContent ? (
                <div>
                    {Array.from(node.children.values())
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((child) => (
                            <DirRow
                                key={child.fullPath}
                                node={child}
                                depth={depth + 1}
                                activeFileId={activeFileId}
                                onSelect={onSelect}
                                forceOpen={forceOpen}
                            />
                        ))}
                    {node.files
                        .slice()
                        .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0) || a.path.localeCompare(b.path))
                        .map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                depth={depth + 1}
                                activeFileId={activeFileId}
                                onSelect={onSelect}
                            />
                        ))}
                </div>
            ) : null}
        </div>
    );
}

function FileRow({
    file,
    depth,
    activeFileId,
    onSelect,
}: {
    file: FileTreeFile;
    depth: number;
    activeFileId: string | null;
    onSelect: (fileId: string) => void;
}) {
    const isActive = file.id === activeFileId;
    const risk = file.riskScore ?? 0;
    return (
        <button
            type="button"
            onClick={() => onSelect(file.id)}
            className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-left",
                isActive ? "bg-accent-contrast text-text" : "hover:bg-muted/60 text-(--fg-2)",
            )}
            style={{ paddingLeft: 16 + depth * 12 }}
        >
            <FileCode className="size-3 shrink-0" />
            <span className="truncate">{file.path}</span>
            {file.language ? (
                <span className="ml-auto text-[9px] uppercase text-(--fg-2)/70 shrink-0">
                    {file.language}
                </span>
            ) : null}
            {risk > 0 ? (
                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shrink-0", riskBadgeClass(risk))}>
                    {Math.round(risk)}
                </Badge>
            ) : null}
        </button>
    );
}
