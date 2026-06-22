import { useQuery } from "@tanstack/react-query";
import { getCapabilityFiles, getCapabilityGraph, getFileGraph, getProjectKnowledgeGraph } from "../api/knowledge.api";

export const knowledgeKeys = {
    all: ["knowledge"] as const,
    projectGraph: (orgId: string, projectId: string, limit?: number) =>
        [...knowledgeKeys.all, "project-graph", orgId, projectId, limit ?? "default"] as const,
    capabilityGraph: (orgId: string, projectId: string, repositoryId?: string) =>
        [...knowledgeKeys.all, "capability-graph", orgId, projectId, repositoryId ?? "all"] as const,
    capabilityFiles: (orgId: string, projectId: string, repositoryId: string, moduleKey: string) =>
        [...knowledgeKeys.all, "capability-files", orgId, projectId, repositoryId, moduleKey] as const,
    fileGraph: (orgId: string, projectId: string, fileId: string) =>
        [...knowledgeKeys.all, "file-graph", orgId, projectId, fileId] as const,
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

export const useCapabilityGraph = (
    orgId: string,
    projectId: string,
    repositoryId?: string,
    enabled = true,
) =>
    useQuery({
        queryKey: knowledgeKeys.capabilityGraph(orgId, projectId, repositoryId),
        queryFn: () => getCapabilityGraph(orgId, projectId, repositoryId),
        enabled: !!orgId && !!projectId && enabled,
    });

export const useCapabilityFiles = (
    orgId: string,
    projectId: string,
    repositoryId: string | undefined,
    moduleKey: string | undefined,
    enabled = true,
) =>
    useQuery({
        queryKey: knowledgeKeys.capabilityFiles(orgId, projectId, repositoryId ?? "", moduleKey ?? ""),
        queryFn: () => getCapabilityFiles(orgId, projectId, repositoryId!, moduleKey!),
        enabled: !!orgId && !!projectId && !!repositoryId && !!moduleKey && enabled,
    });

export const useFileGraph = (
    orgId: string,
    projectId: string,
    fileId: string | undefined,
    enabled = true,
) =>
    useQuery({
        queryKey: knowledgeKeys.fileGraph(orgId, projectId, fileId ?? ""),
        queryFn: () => getFileGraph(orgId, projectId, fileId!),
        enabled: !!orgId && !!projectId && !!fileId && enabled,
    });
