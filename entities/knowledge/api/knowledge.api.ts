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
