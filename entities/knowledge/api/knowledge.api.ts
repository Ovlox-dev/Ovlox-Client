import { apiClient } from "@/shared/api/client";

/* -------------------------------------------------------------------------- */
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */

export type KnowledgeNodeKind = "FEATURE" | "FILE" | "PERSON";

export interface KnowledgeGraphNode {
    id: string;
    type: KnowledgeNodeKind;
    label: string;
    meta?: Record<string, unknown>;
}

export interface KnowledgeGraphLink {
    source: string;
    target: string;
    relation: string;
}

export interface ProjectKnowledgeGraph {
    nodes: KnowledgeGraphNode[];
    links: KnowledgeGraphLink[];
    counts: { features: number; files: number; people: number; links: number };
}

/* -------------------------------------------------------------------------- */
/*                                   API                                      */
/* -------------------------------------------------------------------------- */

/** Whole-project cross-domain graph: Features ↔ Files ↔ People (assembled server-side). */
export const getProjectKnowledgeGraph = async (
    orgId: string,
    projectId: string,
    limit?: number,
): Promise<ProjectKnowledgeGraph> => {
    const res = await apiClient.get<ProjectKnowledgeGraph>(
        `/orgs/${orgId}/projects/${projectId}/knowledge/project-graph`,
        { params: limit ? { limit } : {} },
    );
    return res.data;
};

/* -------------------------------------------------------------------------- */
/*                              Capability map                                 */
/* -------------------------------------------------------------------------- */

export interface CapabilityNode {
    id: string;
    label: string;
    kind: "CAPABILITY";
    moduleKey: string;
    repositoryId: string;
    repositoryName: string | null;
    fileCount: number;
    description: string | null;
    files: Array<{ path: string; intent: string | null }>;
}

export interface CapabilityLink {
    source: string;
    target: string;
    relation: "DEPENDS_ON";
    weight: number;
}

export interface CapabilityGraph {
    nodes: CapabilityNode[];
    links: CapabilityLink[];
    counts: { capabilities: number; files: number; dependencies: number; repositories: number };
}

/** Codebase clustered into capability modules, connected by real import dependencies. */
export const getCapabilityGraph = async (
    orgId: string,
    projectId: string,
    repositoryId?: string,
): Promise<CapabilityGraph> => {
    const res = await apiClient.get<CapabilityGraph>(
        `/orgs/${orgId}/projects/${projectId}/knowledge/capability-graph`,
        { params: repositoryId ? { repositoryId } : {} },
    );
    return res.data;
};

/* --------- drill-down: inside a capability (its files) --------------------- */

export interface CapabilityFileNode {
    id: string;
    path: string;
    name: string;
    intent: string | null;
    language: string | null;
    riskScore: number | null;
}

export interface CapabilityFilesGraph {
    moduleKey: string;
    label: string;
    nodes: CapabilityFileNode[];
    links: Array<{ source: string; target: string; relation: "IMPORTS" }>;
}

/** Files inside one capability (repo-scoped) + the import edges between them. */
export const getCapabilityFiles = async (
    orgId: string,
    projectId: string,
    repositoryId: string,
    moduleKey: string,
): Promise<CapabilityFilesGraph> => {
    const res = await apiClient.get<CapabilityFilesGraph>(
        `/orgs/${orgId}/projects/${projectId}/knowledge/capability-files`,
        { params: { repositoryId, module: moduleKey } },
    );
    return res.data;
};

/* --------- drill-down: inside a file (its functions + call logic) ---------- */

export interface FileSymbolNode {
    id: string;
    label: string;
    type: string;
    signature: string | null;
    startLine: number | null;
    endLine: number | null;
}

export interface FileGraph {
    file: { id: string; path: string; language: string | null; intent: string | null; howToWork: string | null } | null;
    nodes: FileSymbolNode[];
    links: Array<{ source: string; target: string; relation: "CALLS" }>;
}

/** A single file's internal symbols + the CALLS edges between them (its call logic). */
export const getFileGraph = async (
    orgId: string,
    projectId: string,
    fileId: string,
): Promise<FileGraph> => {
    const res = await apiClient.get<FileGraph>(
        `/orgs/${orgId}/projects/${projectId}/knowledge/file-graph`,
        { params: { fileId } },
    );
    return res.data;
};
