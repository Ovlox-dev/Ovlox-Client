import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type ReportType,
    type UpsertScheduleRequest,
    deleteSchedule,
    getSchedule,
    listSchedules,
    upsertSchedule,
} from "../api/reports.api";

export const reportsKeys = {
    all: ["reports"] as const,
    schedules: (orgId: string, projectId: string) =>
        [...reportsKeys.all, "schedules", orgId, projectId] as const,
    schedule: (orgId: string, projectId: string, reportType: ReportType) =>
        [...reportsKeys.all, "schedule", orgId, projectId, reportType] as const,
};

export const useListSchedules = (orgId: string, projectId: string) =>
    useQuery({
        queryKey: reportsKeys.schedules(orgId, projectId),
        queryFn: () => listSchedules(orgId, projectId),
        enabled: !!orgId && !!projectId,
    });

export const useGetSchedule = (orgId: string, projectId: string, reportType: ReportType | undefined) =>
    useQuery({
        queryKey: reportsKeys.schedule(orgId, projectId, reportType ?? "DAILY"),
        queryFn: () => getSchedule(orgId, projectId, reportType!),
        enabled: !!orgId && !!projectId && !!reportType,
    });

export const useUpsertSchedule = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ reportType, data }: { reportType: ReportType; data: UpsertScheduleRequest }) =>
            upsertSchedule(orgId, projectId, reportType, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reportsKeys.schedules(orgId, projectId) });
        },
    });
};

export const useDeleteSchedule = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reportType: ReportType) => deleteSchedule(orgId, projectId, reportType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reportsKeys.schedules(orgId, projectId) });
        },
    });
};
