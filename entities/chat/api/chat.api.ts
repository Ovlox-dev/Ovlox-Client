import { apiClient } from "@/shared/api/client";
import type {
    ChatMessageWithDetails,
    ConversationWithDetails,
    CreateConversationRequest,
    ListConversationsResponse,
    SendMessageRequest,
    SendMessageResponse,
} from "@/types/api-types";
import type { IConversation } from "@/types/prisma-generated";

export const createConversation = async (data: CreateConversationRequest): Promise<IConversation> => {
    const response = await apiClient.post<IConversation>("/chat/conversations", data);
    return response.data;
};

export const listConversations = async (params?: {
    projectId?: string;
    organizationId?: string;
}): Promise<ListConversationsResponse> => {
    const response = await apiClient.get<ListConversationsResponse>("/chat/conversations", { params });
    return response.data;
};

export const getConversation = async (conversationId: string): Promise<ConversationWithDetails> => {
    const response = await apiClient.get<ConversationWithDetails>(`/chat/conversations/${conversationId}`);
    return response.data;
};

export const updateConversation = async (
    conversationId: string,
    data: { title?: string },
): Promise<IConversation> => {
    const response = await apiClient.put<IConversation>(`/chat/conversations/${conversationId}`, data);
    return response.data;
};

export const listMessages = async (
    conversationId: string,
    params?: { limit?: number; before?: string },
): Promise<ChatMessageWithDetails[]> => {
    const response = await apiClient.get<ChatMessageWithDetails[]>(
        `/chat/conversations/${conversationId}/messages`,
        { params },
    );
    return response.data;
};

export const sendMessage = async (
    conversationId: string,
    data: SendMessageRequest,
): Promise<SendMessageResponse> => {
    const response = await apiClient.post<SendMessageResponse>(
        `/chat/conversations/${conversationId}/messages`,
        data,
    );
    return response.data;
};

export const retryJob = async (
    jobId: string,
): Promise<{ status: string; jobId: string; message: string }> => {
    const response = await apiClient.post<{ status: string; jobId: string; message: string }>(
        `/chat/jobs/${jobId}/retry`,
    );
    return response.data;
};
