import { useQuery } from "@tanstack/react-query";

import {
    getCodeFile,
    getRepository,
    listCodeFiles,
    listFileRisks,
    listRepositories,
    unwrapList,
} from "../api/repositories.api";
import type { ExternalProvider } from "@/types/enum";
import { projectKeys } from "./projects.queries";

const repoKeys = {
    list: (orgId: string, projectId: string, params?: unknown) =>
        [...projectKeys.detail(orgId, projectId), "repositories", "list", params] as const,
    detail: (orgId: string, projectId: string, repositoryId: string) =>
        [...projectKeys.detail(orgId, projectId), "repositories", repositoryId] as const,
    risks: (orgId: string, projectId: string, params?: unknown) =>
        [...projectKeys.detail(orgId, projectId), "repositories", "risks", params] as const,
    files: (orgId: string, projectId: string, repositoryId: string, params?: unknown) =>
        [...projectKeys.detail(orgId, projectId), "repositories", repositoryId, "files", params] as const,
    file: (orgId: string, projectId: string, fileId: string) =>
        [...projectKeys.detail(orgId, projectId), "repositories", "code-file", fileId] as const,
};

export const useListRepositories = (
    orgId: string,
    projectId: string,
    params?: { provider?: ExternalProvider | string; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: repoKeys.list(orgId, projectId, params),
        queryFn: async () => unwrapList(await listRepositories(orgId, projectId, params)),
        enabled: !!orgId && !!projectId,
    });

export const useGetRepository = (orgId: string, projectId: string, repositoryId: string | undefined) =>
    useQuery({
        queryKey: repoKeys.detail(orgId, projectId, repositoryId ?? ""),
        queryFn: () => getRepository(orgId, projectId, repositoryId!),
        enabled: !!orgId && !!projectId && !!repositoryId,
    });

export const useListFileRisks = (
    orgId: string,
    projectId: string,
    params?: { repositoryId?: string; minRiskScore?: number; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: repoKeys.risks(orgId, projectId, params),
        queryFn: async () => unwrapList(await listFileRisks(orgId, projectId, params)),
        enabled: !!orgId && !!projectId,
    });

export const useListCodeFiles = (
    orgId: string,
    projectId: string,
    repositoryId: string | undefined,
    params?: { language?: string; minRiskScore?: number; limit?: number; offset?: number },
) =>
    useQuery({
        queryKey: repoKeys.files(orgId, projectId, repositoryId ?? "", params),
        queryFn: async () => unwrapList(await listCodeFiles(orgId, projectId, repositoryId!, params)),
        enabled: !!orgId && !!projectId && !!repositoryId,
    });

export const useGetCodeFile = (orgId: string, projectId: string, fileId: string | undefined) =>
    useQuery({
        queryKey: repoKeys.file(orgId, projectId, fileId ?? ""),
        queryFn: () => getCodeFile(orgId, projectId, fileId!),
        enabled: !!orgId && !!projectId && !!fileId,
    });
