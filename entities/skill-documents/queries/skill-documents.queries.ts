import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createSkillDocument,
    deleteSkillDocument,
    generateProjectOverview,
    listFileSkillDocs,
    listSkillDocuments,
    updateSkillDocument,
    type CreateSkillDocumentBody,
    type SkillScope,
    type SkillStatus,
    type UpdateSkillDocumentBody,
} from "../api/skill-documents.api";

export const skillDocKeys = {
    all: ["skill-documents"] as const,
    list: (orgId: string, params?: unknown) => [...skillDocKeys.all, "list", orgId, params] as const,
    fileDocs: (orgId: string, projectId: string) => [...skillDocKeys.all, "file-docs", orgId, projectId] as const,
};

export const useListSkillDocuments = (
    orgId: string,
    params?: { projectId?: string; scope?: SkillScope; status?: SkillStatus },
) =>
    useQuery({
        queryKey: skillDocKeys.list(orgId, params),
        queryFn: () => listSkillDocuments(orgId, params),
        enabled: !!orgId,
    });

export const useListFileSkillDocs = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: skillDocKeys.fileDocs(orgId, projectId),
        queryFn: () => listFileSkillDocs(orgId, projectId),
        enabled: !!orgId && !!projectId,
    });

export const useCreateSkillDocument = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateSkillDocumentBody) => createSkillDocument(orgId, body),
        onSuccess: () => void qc.invalidateQueries({ queryKey: skillDocKeys.all }),
    });
};

export const useUpdateSkillDocument = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { id: string; body: UpdateSkillDocumentBody }) => updateSkillDocument(orgId, vars.id, vars.body),
        onSuccess: () => void qc.invalidateQueries({ queryKey: skillDocKeys.all }),
    });
};

export const useDeleteSkillDocument = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteSkillDocument(orgId, id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: skillDocKeys.all }),
    });
};

export const useGenerateProjectOverview = (orgId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { projectId: string; repositoryId?: string | null }) =>
            generateProjectOverview(orgId, vars.projectId, vars.repositoryId),
        onSuccess: () => void qc.invalidateQueries({ queryKey: skillDocKeys.all }),
    });
};
