import { apiClient } from "@/shared/api/client";

export interface DiagnosticCheck {
    name: string;
    ok: boolean;
    detail?: string;
}

export interface DiagnosticsResponse {
    ok: boolean;
    checks: DiagnosticCheck[];
}

export interface BootstrapOpenAiResponse {
    created?: number;
    updated?: number;
    skipped?: number;
}

export const runOpenAiDiagnostics = async (): Promise<DiagnosticsResponse> => {
    const response = await apiClient.get<DiagnosticsResponse>(
        `/admin/llm-models/diagnostics/openai`,
    );
    return response.data;
};

export const bootstrapOpenAiModels = async (
    body?: { overwriteExisting?: boolean },
): Promise<BootstrapOpenAiResponse> => {
    const response = await apiClient.post<BootstrapOpenAiResponse>(
        `/admin/llm-models/bootstrap/openai`,
        body ?? {},
    );
    return response.data;
};
