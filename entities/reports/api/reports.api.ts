import { apiClient } from "@/shared/api/client";

export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface ScheduledReport {
    id: string;
    projectId: string;
    reportType: ReportType;
    isEnabled: boolean;
    nextRunAt: string;
    lastError?: string | null;
    failureCount?: number | null;
    lastReportId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    lastReport?: {
        id: string;
        reportType: ReportType;
        periodStart: string;
        periodEnd: string;
        createdAt: string;
        summary?: string | null;
    } | null;
}

export interface UpsertScheduleRequest {
    nextRunAt?: string;
    isEnabled?: boolean;
    clearError?: boolean;
}

export const listSchedules = async (
    orgId: string,
    projectId: string,
): Promise<{ schedules: ScheduledReport[] }> => {
    const response = await apiClient.get<{ schedules: ScheduledReport[] }>(
        `/orgs/${orgId}/projects/${projectId}/scheduled-reports`,
    );
    return response.data;
};

export const getSchedule = async (
    orgId: string,
    projectId: string,
    reportType: ReportType,
): Promise<ScheduledReport> => {
    const response = await apiClient.get<ScheduledReport>(
        `/orgs/${orgId}/projects/${projectId}/scheduled-reports/${reportType}`,
    );
    return response.data;
};

export const upsertSchedule = async (
    orgId: string,
    projectId: string,
    reportType: ReportType,
    data: UpsertScheduleRequest,
): Promise<ScheduledReport> => {
    const response = await apiClient.put<ScheduledReport>(
        `/orgs/${orgId}/projects/${projectId}/scheduled-reports/${reportType}`,
        data,
    );
    return response.data;
};

export const deleteSchedule = async (
    orgId: string,
    projectId: string,
    reportType: ReportType,
): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/scheduled-reports/${reportType}`,
    );
    return response.data;
};
