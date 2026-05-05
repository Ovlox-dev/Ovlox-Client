import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createConversation,
    getConversation,
    listConversations,
    listMessages,
    retryJob,
    sendMessage,
    updateConversation,
} from "../api/chat.api";

export const chatKeys = {
    all: ["chat"] as const,
    conversations: (params?: unknown) => [...chatKeys.all, "conversations", params] as const,
    conversation: (conversationId: string) =>
        [...chatKeys.all, "conversation", conversationId] as const,
    messages: (conversationId: string) =>
        [...chatKeys.all, "messages", conversationId] as const,
};

export const useListConversations = (params?: { projectId?: string; organizationId?: string }) =>
    useQuery({
        queryKey: chatKeys.conversations(params),
        queryFn: () => listConversations(params),
        enabled: !!(params?.projectId || params?.organizationId),
    });

export const useGetConversation = (conversationId: string | undefined) =>
    useQuery({
        queryKey: chatKeys.conversation(conversationId ?? ""),
        queryFn: () => getConversation(conversationId!),
        enabled: !!conversationId,
    });

export const useListMessages = (
    conversationId: string | undefined,
    params?: { limit?: number; before?: string },
) =>
    useQuery({
        queryKey: [...chatKeys.messages(conversationId ?? ""), params],
        queryFn: () => listMessages(conversationId!, params),
        enabled: !!conversationId,
    });

export const useCreateConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createConversation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "conversations"] });
        },
    });
};

export const useUpdateConversation = (conversationId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { title?: string }) => updateConversation(conversationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
            queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "conversations"] });
        },
    });
};

export const useSendMessage = (conversationId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof sendMessage>[1]) => sendMessage(conversationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
        },
    });
};

export const useRetryJob = () => useMutation({ mutationFn: retryJob });
