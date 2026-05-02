import { apiClient } from "@/shared/api/client";

/* Backend lives at src/modules/tasks/tasks.controller.ts. The status / source / priority enums
 * mirror src/database/enums.ts → TaskStatus / TaskSource / TaskPriority. */
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED" | "CANCELLED";
export type TaskSource = "MANUAL" | "AUTO_DETECTED" | "IMPORTED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority?: TaskPriority | null;
    dueDate?: string | null;
    source: TaskSource;
    autoDetectedByMemberId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    assignments?: Array<{ memberId: string; createdAt: string }>;
}

export interface CreateTaskRequest {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    assigneeMemberIds?: string[];
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
}

export interface ListTasksParams {
    status?: TaskStatus | TaskStatus[];
    priority?: TaskPriority;
    assigneeMemberId?: string;
    keyword?: string;
    page?: number;
    limit?: number;
}

export const listTasks = async (
    orgId: string,
    projectId: string,
    params?: ListTasksParams,
): Promise<{ tasks: Task[]; total: number }> => {
    const response = await apiClient.get<{ tasks: Task[]; total: number }>(
        `/orgs/${orgId}/projects/${projectId}/tasks`,
        { params },
    );
    return response.data;
};

export const getTask = async (orgId: string, projectId: string, taskId: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`);
    return response.data;
};

export const createTask = async (
    orgId: string,
    projectId: string,
    data: CreateTaskRequest,
): Promise<Task> => {
    const response = await apiClient.post<Task>(`/orgs/${orgId}/projects/${projectId}/tasks`, data);
    return response.data;
};

export const updateTask = async (
    orgId: string,
    projectId: string,
    taskId: string,
    data: UpdateTaskRequest,
): Promise<Task> => {
    const response = await apiClient.put<Task>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`,
        data,
    );
    return response.data;
};

export const deleteTask = async (
    orgId: string,
    projectId: string,
    taskId: string,
): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`,
    );
    return response.data;
};

/**
 * Assign a task to a single org member or to a team. Backend rejects the call
 * if both `assigneeId` and `teamId` are provided.
 */
export const assignTask = async (
    orgId: string,
    projectId: string,
    taskId: string,
    body: { assigneeId?: string; teamId?: string },
): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/assign`,
        body,
    );
    return response.data;
};

export const updateTaskStatus = async (
    orgId: string,
    projectId: string,
    taskId: string,
    status: TaskStatus,
): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/status`,
        { status },
    );
    return response.data;
};

export interface CreateTaskTeamRequest {
    name: string;
    memberIds: string[];
}

export const createTaskTeam = async (
    orgId: string,
    projectId: string,
    taskId: string,
    body: CreateTaskTeamRequest,
): Promise<{ message: string; teamId?: string }> => {
    const response = await apiClient.post<{ message: string; teamId?: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/team`,
        body,
    );
    return response.data;
};

export type TaskTeamMemberRole = "LEAD" | "DEVELOPER" | "QA" | "DESIGNER" | "PROJECT_MANAGER" | "REVIEWER" | "OBSERVER";

export const addTaskTeamMember = async (
    orgId: string,
    projectId: string,
    taskId: string,
    body: { memberId: string; role: TaskTeamMemberRole },
): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/team/members`,
        body,
    );
    return response.data;
};

export const removeTaskTeamMember = async (
    orgId: string,
    projectId: string,
    taskId: string,
    memberId: string,
): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/team/members/${memberId}`,
    );
    return response.data;
};

export type TaskEventRelationship = "MENTIONED" | "PROGRESS" | "COMPLETED" | "BLOCKED" | "RELATED";

export const linkRawEventToTask = async (
    orgId: string,
    projectId: string,
    taskId: string,
    body: { rawEventId: string; relationship: TaskEventRelationship; relevance?: number },
): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/link-event`,
        body,
    );
    return response.data;
};
