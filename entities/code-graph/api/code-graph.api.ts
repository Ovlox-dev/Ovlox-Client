import { apiClient } from "@/shared/api/client";

/* -------------------------------------------------------------------------- */
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */

export interface CodeTreeNode {
    id: string;
    parentId: string | null;
    path: string;
    name: string;
    kind: "FILE" | "DIR";
    depth: number;
    codeFileId: string | null;
    repositoryId: string;
}

export interface CodeSymbol {
    id: string;
    kind: string; // FUNCTION | METHOD | CLASS | INTERFACE | CONSTANT | VARIABLE
    name: string;
    qualifiedName?: string | null;
    signature?: string | null;
    startLine?: number | null;
    endLine?: number | null;
}

export interface GraphNeighbor {
    direction: "in" | "out";
    relation: string; // CALLS | IMPORTS | CONTAINS | REFERENCES | DEFINES ...
    neighborId: string;
    neighborType: string; // CODE_FILE | FUNCTION | SYMBOL | RAW_EVENT | FEATURE
    confidence?: number;
    metadata?: Record<string, unknown>;
    label: string;
}

export interface NeighborsResponse {
    nodeId: string;
    neighbors: GraphNeighbor[];
}

export interface ProjectGraphNode {
    id: string;
    path: string;
    riskScore: number | null;
    repositoryId: string;
}

export interface ProjectGraphResponse {
    nodes: ProjectGraphNode[];
    links: Array<{ source: string; target: string; relation: string }>;
}

/* -------------------------------------------------------------------------- */
/*                                   API                                      */
/* -------------------------------------------------------------------------- */

export const getCodeTree = async (
    orgId: string,
    projectId: string,
    repositoryId?: string,
): Promise<CodeTreeNode[]> => {
    const res = await apiClient.get<{ nodes: CodeTreeNode[] }>(
        `/orgs/${orgId}/projects/${projectId}/code-tree`,
        { params: repositoryId ? { repositoryId } : undefined },
    );
    return res.data.nodes ?? [];
};

export const getProjectGraph = async (
    orgId: string,
    projectId: string,
    repositoryId?: string,
    limit?: number,
): Promise<ProjectGraphResponse> => {
    const res = await apiClient.get<ProjectGraphResponse>(
        `/orgs/${orgId}/projects/${projectId}/code-graph/project`,
        { params: { ...(repositoryId ? { repositoryId } : {}), ...(limit ? { limit } : {}) } },
    );
    return res.data;
};

export const getFileSymbols = async (
    orgId: string,
    projectId: string,
    fileId: string,
): Promise<CodeSymbol[]> => {
    const res = await apiClient.get<{ symbols: CodeSymbol[] }>(
        `/orgs/${orgId}/projects/${projectId}/code-graph/file-symbols`,
        { params: { fileId } },
    );
    return res.data.symbols ?? [];
};

export const getNeighbors = async (
    orgId: string,
    projectId: string,
    nodeId: string,
    direction: "in" | "out" | "both" = "both",
): Promise<NeighborsResponse> => {
    const res = await apiClient.get<NeighborsResponse>(
        `/orgs/${orgId}/projects/${projectId}/code-graph/neighbors`,
        { params: { nodeId, direction } },
    );
    return res.data;
};

export const getCallers = async (
    orgId: string,
    projectId: string,
    symbolId: string,
): Promise<NeighborsResponse> => {
    const res = await apiClient.get<NeighborsResponse>(
        `/orgs/${orgId}/projects/${projectId}/code-graph/callers`,
        { params: { symbolId } },
    );
    return res.data;
};

export const getCallees = async (
    orgId: string,
    projectId: string,
    symbolId: string,
): Promise<NeighborsResponse> => {
    const res = await apiClient.get<NeighborsResponse>(
        `/orgs/${orgId}/projects/${projectId}/code-graph/callees`,
        { params: { symbolId } },
    );
    return res.data;
};
