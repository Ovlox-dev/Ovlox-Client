import { apiClient , apiBaseUrl} from "@/shared/api/client";
import {
    CreateConversationRequest,
    ListConversationsResponse,
    SendMessageRequest,
    SendMessageResponse,
    JobStatusResponse,
    ChatMessageWithDetails,
    ConversationWithDetails,
} from "@/types/api-types";
import { IConversation } from "@/types/prisma-generated";
import { toast } from "sonner";

// Create a new conversation
export const createConversation = async (data: CreateConversationRequest): Promise<IConversation> => {
    const response = await apiClient.post<IConversation>("/chat/conversations", data);
    return response.data;
};

// List conversations
export const listConversations = async (params?: {
    projectId?: string;
    organizationId?: string;
}): Promise<ListConversationsResponse> => {
    const response = await apiClient.get<ListConversationsResponse>("/chat/conversations", { params });
    return response.data;
};

// Get conversation by ID with full details
export const getConversation = async (conversationId: string): Promise<ConversationWithDetails> => {
    const response = await apiClient.get<ConversationWithDetails>(`/chat/conversations/${conversationId}`);
    return response.data;
};

// Update conversation
export const updateConversation = async (
    conversationId: string,
    data: { title?: string }
): Promise<IConversation> => {
    const response = await apiClient.put<IConversation>(`/chat/conversations/${conversationId}`, data);
    return response.data;
};

// Get messages with pagination (returns array directly per README)
export const listMessages = async (
    conversationId: string,
    params?: { limit?: number; before?: string }
): Promise<ChatMessageWithDetails[]> => {
    const response = await apiClient.get<ChatMessageWithDetails[]>(
        `/chat/conversations/${conversationId}/messages`,
        { params }
    );
    return response.data;
};

// Send a message (ask question)
export const sendMessage = async (
    conversationId: string,
    data: SendMessageRequest
): Promise<SendMessageResponse> => {
    const response = await apiClient.post<SendMessageResponse>(
        `/chat/conversations/${conversationId}/messages`,
        data
    );
    return response.data;
};

// Get job status
export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
    const response = await apiClient.get<JobStatusResponse>(`/chat/jobs/${jobId}/status`);
    return response.data;
};

// Retry a failed job
export const retryJob = async (jobId: string): Promise<{ status: string; jobId: string; message: string }> => {
    const response = await apiClient.post<{ status: string; jobId: string; message: string }>(
        `/chat/jobs/${jobId}/retry`
    );
    return response.data;
};

// Stream job status via SSE (for real-time updates without WebSocket)
export const streamJobStatus = (jobId: string, onUpdate: (data: unknown) => void, onError?: (error: Error) => void) => {
    const eventSource = new EventSource(`${apiBaseUrl}/chat/jobs/${jobId}/stream`, {
        withCredentials: true,
    });

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onUpdate(data);
            
            if (data.completed) {
                eventSource.close();
            }
        } catch (error) {
            toast.error("Failed to parse SSE data", { description: (error as Error).message });
        }
    };

    eventSource.onerror = (error) => {
        toast.error("SSE error", { description: (error as unknown as Error).message });
        eventSource.close();
        onError?.(new Error("Failed to stream job status"));
    };

    return () => eventSource.close();
};
