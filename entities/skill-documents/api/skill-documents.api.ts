import { apiClient } from "@/shared/api/client";

export type SkillScope = "GLOBAL" | "ORG" | "PROJECT";
export type SkillStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface SkillDocument {
    id: string;
    scope: SkillScope;
    organizationId: string;
    projectId: string | null;
    repositoryId: string | null;
    title: string;
    summary: string | null;
    body: string;
    status: SkillStatus;
    generatedByLlm: boolean;
    tags: Record<string, unknown> | null;
    version: number;
    createdById: string | null;
    createdAt: string;
    updated_at: string;
}

export interface CreateSkillDocumentBody {
    title: string;
    body: string;
    summary?: string;
    scope: SkillScope;
    projectId?: string | null;
    repositoryId?: string | null;
    tags?: Record<string, unknown>;
}

export interface UpdateSkillDocumentBody {
    title?: string;
    summary?: string;
    body?: string;
    tags?: Record<string, unknown>;
    status?: SkillStatus;
}

export const listSkillDocuments = async (
    orgId: string,
    params?: { projectId?: string; scope?: SkillScope; status?: SkillStatus },
): Promise<SkillDocument[]> => {
    const res = await apiClient.get<SkillDocument[]>(`/orgs/${orgId}/skill-documents`, { params });
    return res.data;
};

export const getSkillDocument = async (orgId: string, id: string): Promise<SkillDocument> => {
    const res = await apiClient.get<SkillDocument>(`/orgs/${orgId}/skill-documents/${id}`);
    return res.data;
};

export const createSkillDocument = async (orgId: string, body: CreateSkillDocumentBody): Promise<SkillDocument> => {
    const res = await apiClient.post<SkillDocument>(`/orgs/${orgId}/skill-documents`, body);
    return res.data;
};

export const updateSkillDocument = async (orgId: string, id: string, body: UpdateSkillDocumentBody): Promise<SkillDocument> => {
    const res = await apiClient.put<SkillDocument>(`/orgs/${orgId}/skill-documents/${id}`, body);
    return res.data;
};

export const deleteSkillDocument = async (orgId: string, id: string): Promise<{ deleted: boolean }> => {
    const res = await apiClient.delete<{ deleted: boolean }>(`/orgs/${orgId}/skill-documents/${id}`);
    return res.data;
};

/** A per-file skill doc generated during code indexing (FileSkillDoc table; read-only). */
export interface FileSkillDoc {
    codeFileId: string;
    path: string;
    language: string | null;
    riskScore: number | null;
    intent: string | null;
    howToWork: string | null;
    dependsOn: unknown;
    body: string;
    updated_at: string;
}

export const listFileSkillDocs = async (orgId: string, projectId: string): Promise<FileSkillDoc[]> => {
    const res = await apiClient.get<FileSkillDoc[]>(`/orgs/${orgId}/projects/${projectId}/file-skill-docs`);
    return res.data;
};

export const generateProjectOverview = async (
    orgId: string,
    projectId: string,
    repositoryId?: string | null,
): Promise<SkillDocument> => {
    const res = await apiClient.post<SkillDocument>(
        `/orgs/${orgId}/projects/${projectId}/skill-documents/generate-overview`,
        { repositoryId: repositoryId ?? null },
    );
    return res.data;
};
