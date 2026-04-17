import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/shared/lib/auth/token-service";
import {
    WsNewMessageEvent,
    WsMessageProcessingEvent,
    WsTypingEvent,
    WsMessageReadEvent,
} from "@/types/api-types";
import { apiBaseUrl } from "@/shared/api/client";
import { toast } from "sonner";

const getSocketUrl = () => {
    const baseUrl = apiBaseUrl.replace(/\/api\/v1$/, "");
    return `${baseUrl}/chat`;
};

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
    if (socket?.connected) {
        return socket;
    }

    const token = getAccessToken();
    if (!token) {
        // Avoid hard-throwing; the server will reject/close the socket if unauthenticated.
        // console.warn("No access token available for socket connection");
        toast.warning("No access token available for socket connection");
    }

    const socketUrl = getSocketUrl();

    const socketQuery = token ? { token } : {};

    socket = io(socketUrl, {
        query: socketQuery,
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
        // console.log("Socket connected:", socket?.id);
        toast.success("Socket connected");
    });

    socket.on("disconnect", (reason) => {
        // console.log("Socket disconnected:", reason);
        toast.error("Socket disconnected");
        if (reason === "io server disconnect") {
            // Server disconnected the socket, reconnect manually
            socket?.connect();
        }
    });

    socket.on("connect_error", (error) => {
        // console.error("Socket connection error:", error);
        toast.error("Socket connection error", { description: error.message });
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = (): Socket | null => {
    return socket;
};

// Join a conversation room
export const joinConversation = (conversationId: string) => {
    if (!socket?.connected) {
        connectSocket();
    }
    socket?.emit("joinConversation", { conversationId });
};

// Leave a conversation room
export const leaveConversation = (conversationId: string) => {
    socket?.emit("leaveConversation", { conversationId });
};

// Send typing indicator
export const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    socket?.emit("typing", { conversationId, isTyping });
};

// Mark message as read
export const markMessageAsRead = (conversationId: string, messageId: string) => {
    socket?.emit("markAsRead", { conversationId, messageId });
};

// Re-export types for convenience
export type NewMessageEvent = WsNewMessageEvent;
export type MessageProcessingEvent = WsMessageProcessingEvent;
export type TypingEvent = WsTypingEvent;
export type MessageReadEvent = WsMessageReadEvent;

// Helper to add event listeners
export const onNewMessage = (callback: (data: NewMessageEvent) => void) => {
    socket?.on("newMessage", callback);
    return () => socket?.off("newMessage", callback);
};

export const onMessageProcessing = (callback: (data: MessageProcessingEvent) => void) => {
    socket?.on("messageProcessing", callback);
    return () => socket?.off("messageProcessing", callback);
};

export const onTyping = (callback: (data: TypingEvent) => void) => {
    socket?.on("typing", callback);
    return () => socket?.off("typing", callback);
};

export const onMessageRead = (callback: (data: MessageReadEvent) => void) => {
    socket?.on("messageRead", callback);
    return () => socket?.off("messageRead", callback);
};
