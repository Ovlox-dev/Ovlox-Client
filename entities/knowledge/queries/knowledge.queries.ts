import { useQuery } from "@tanstack/react-query";
import { getProjectKnowledgeGraph } from "../api/knowledge.api";

export const knowledgeKeys = {
    all: ["knowledge"] as const,
    projectGraph: (orgId: string, projectId: string, limit?: number) =>
        [...knowledgeKeys.all, "project-graph", orgId, projectId, limit ?? "default"] as const,
};

export const useProjectKnowledgeGraph = (
    orgId: string,
    projectId: string,
    limit?: number,
    enabled = true,
) =>
    useQuery({
        queryKey: knowledgeKeys.projectGraph(orgId, projectId, limit),
        queryFn: () => getProjectKnowledgeGraph(orgId, projectId, limit),
        enabled: !!orgId && !!projectId && enabled,
    });
