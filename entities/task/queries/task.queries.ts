import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type CreateTaskRequest,
    type CreateTaskTeamRequest,
    type ListTasksParams,
    type TaskEventRelationship,
    type TaskStatus,
    type TaskTeamMemberRole,
    type UpdateTaskRequest,
    addTaskTeamMember,
    assignTask,
    createTask,
    createTaskTeam,
    deleteTask,
    getTask,
    linkRawEventToTask,
    listTasks,
    removeTaskTeamMember,
    updateTask,
    updateTaskStatus,
} from "../api/task.api";

export const taskKeys = {
    all: ["tasks"] as const,
    lists: (orgId: string, projectId: string) =>
        [...taskKeys.all, orgId, projectId] as const,
    list: (orgId: string, projectId: string, params?: unknown) =>
        [...taskKeys.lists(orgId, projectId), params] as const,
    detail: (orgId: string, projectId: string, taskId: string) =>
        [...taskKeys.all, orgId, projectId, taskId] as const,
};

export const useListTasks = (orgId: string, projectId: string, params?: ListTasksParams) =>
    useQuery({
        queryKey: taskKeys.list(orgId, projectId, params),
        queryFn: () => listTasks(orgId, projectId, params),
        enabled: !!orgId && !!projectId,
    });

export const useGetTask = (orgId: string, projectId: string, taskId: string | undefined) =>
    useQuery({
        queryKey: taskKeys.detail(orgId, projectId, taskId ?? ""),
        queryFn: () => getTask(orgId, projectId, taskId!),
        enabled: !!orgId && !!projectId && !!taskId,
    });

export const useCreateTask = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTaskRequest) => createTask(orgId, projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists(orgId, projectId) });
        },
    });
};

export const useUpdateTask = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateTaskRequest) => updateTask(orgId, projectId, taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists(orgId, projectId) });
            queryClient.invalidateQueries({
                queryKey: taskKeys.detail(orgId, projectId, taskId),
            });
        },
    });
};

export const useDeleteTask = (orgId: string, projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (taskId: string) => deleteTask(orgId, projectId, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists(orgId, projectId) });
        },
    });
};

export const useAssignTask = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: { assigneeId?: string; teamId?: string }) =>
            assignTask(orgId, projectId, taskId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists(orgId, projectId) });
        },
    });
};

export const useUpdateTaskStatus = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (status: TaskStatus) => updateTaskStatus(orgId, projectId, taskId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists(orgId, projectId) });
        },
    });
};

export const useCreateTaskTeam = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTaskTeamRequest) => createTaskTeam(orgId, projectId, taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
        },
    });
};

export const useAddTaskTeamMember = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: { memberId: string; role: TaskTeamMemberRole }) =>
            addTaskTeamMember(orgId, projectId, taskId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
        },
    });
};

export const useRemoveTaskTeamMember = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string) => removeTaskTeamMember(orgId, projectId, taskId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
        },
    });
};

export const useLinkRawEventToTask = (orgId: string, projectId: string, taskId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: { rawEventId: string; relationship: TaskEventRelationship; relevance?: number }) =>
            linkRawEventToTask(orgId, projectId, taskId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, projectId, taskId) });
        },
    });
};
