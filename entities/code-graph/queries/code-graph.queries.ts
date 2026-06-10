import { useQuery } from "@tanstack/react-query";

import {
    getCallees,
    getCallers,
    getCodeTree,
    getFileSymbols,
    getNeighbors,
} from "../api/code-graph.api";

export const codeGraphKeys = {
    all: ["code-graph"] as const,
    tree: (orgId: string, projectId: string, repositoryId?: string) =>
        [...codeGraphKeys.all, "tree", orgId, projectId, repositoryId ?? "all"] as const,
    fileSymbols: (orgId: string, projectId: string, fileId: string) =>
        [...codeGraphKeys.all, "file-symbols", orgId, projectId, fileId] as const,
    neighbors: (orgId: string, projectId: string, nodeId: string, direction: string) =>
        [...codeGraphKeys.all, "neighbors", orgId, projectId, nodeId, direction] as const,
    callers: (orgId: string, projectId: string, symbolId: string) =>
        [...codeGraphKeys.all, "callers", orgId, projectId, symbolId] as const,
    callees: (orgId: string, projectId: string, symbolId: string) =>
        [...codeGraphKeys.all, "callees", orgId, projectId, symbolId] as const,
};

export const useCodeTree = (orgId: string, projectId: string, repositoryId?: string) =>
    useQuery({
        queryKey: codeGraphKeys.tree(orgId, projectId, repositoryId),
        queryFn: () => getCodeTree(orgId, projectId, repositoryId),
        enabled: !!orgId && !!projectId,
    });

export const useFileSymbols = (orgId: string, projectId: string, fileId: string | undefined) =>
    useQuery({
        queryKey: codeGraphKeys.fileSymbols(orgId, projectId, fileId ?? ""),
        queryFn: () => getFileSymbols(orgId, projectId, fileId!),
        enabled: !!orgId && !!projectId && !!fileId,
    });

export const useNeighbors = (
    orgId: string,
    projectId: string,
    nodeId: string | undefined,
    direction: "in" | "out" | "both" = "both",
) =>
    useQuery({
        queryKey: codeGraphKeys.neighbors(orgId, projectId, nodeId ?? "", direction),
        queryFn: () => getNeighbors(orgId, projectId, nodeId!, direction),
        enabled: !!orgId && !!projectId && !!nodeId,
    });

export const useCallers = (orgId: string, projectId: string, symbolId: string | undefined) =>
    useQuery({
        queryKey: codeGraphKeys.callers(orgId, projectId, symbolId ?? ""),
        queryFn: () => getCallers(orgId, projectId, symbolId!),
        enabled: !!orgId && !!projectId && !!symbolId,
    });

export const useCallees = (orgId: string, projectId: string, symbolId: string | undefined) =>
    useQuery({
        queryKey: codeGraphKeys.callees(orgId, projectId, symbolId ?? ""),
        queryFn: () => getCallees(orgId, projectId, symbolId!),
        enabled: !!orgId && !!projectId && !!symbolId,
    });
