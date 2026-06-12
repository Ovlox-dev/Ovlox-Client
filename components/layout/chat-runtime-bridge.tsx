"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { setOnAssistantMessageReady } from "@/lib/chat-runtime";
import { onConversationUpdated } from "@/lib/socket";
import { chatKeys } from "@/entities/chat/queries/chat.queries";

/**
 * Wires the global chat runtime to the React Query cache. When an assistant message lands
 * (via the socket's `newMessage` event handled inside `lib/chat-runtime.ts`), this bridge
 * invalidates the relevant query keys so any mounted chat panel automatically refetches —
 * even if the message arrived while no panel was visible. Mount once at the AppShell level.
 */
export function ChatRuntimeBridge() {
    const queryClient = useQueryClient();

    React.useEffect(() => {
        setOnAssistantMessageReady(({ conversationId }) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
            queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "conversations"] });
        });
        // Auto-title (and any title change) → refresh the sidebar list + the open conversation header.
        const offTitle = onConversationUpdated(({ conversationId }) => {
            queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "conversations"] });
            queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
        });
        return () => { setOnAssistantMessageReady(null); offTitle(); };
    }, [queryClient]);

    return null;
}
