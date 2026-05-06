import { io, Socket } from "socket.io-client";
import { getAccessToken, refreshAccessToken } from "@/shared/lib/auth/token-service";
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
let connectingPromise: Promise<Socket> | null = null;
const isDev = process.env.NODE_ENV !== "production";
// let lastConnectErrorToastAt = 0;
/**
 * Reference count of active consumers (chat panels currently mounted). The socket is
 * only torn down when the last consumer unmounts, preventing the drawer from killing
 * the page chat (or vice versa) when both are open.
 */
let consumerCount = 0;

/**
 * Reconnect with a freshly refreshed access token. Called when the backend rejects
 * the handshake (token expired or missing).
 */
async function reconnectWithFreshToken(): Promise<void> {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    connectingPromise = null;
    const fresh = await refreshAccessToken();
    if (!fresh) {
        toast.error("Session expired. Please sign in again.");
        return;
    }
    await connectSocketAsync();
}

async function connectSocketAsync(): Promise<Socket> {
    if (socket?.connected) { return socket; }
    if (connectingPromise) { return connectingPromise; }

    connectingPromise = (async () => {
        let token = getAccessToken();
        // If missing or stale, do a refresh — handshake without a token is rejected.
        if (!token) {
            token = await refreshAccessToken();
        }

        const next = io(getSocketUrl(), {
            auth: token ? { token } : {},
            // Allow polling fallback for environments where WS is blocked/proxied.
            // (If you remove this entirely, socket.io will negotiate transports anyway.)
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            withCredentials: true,
        });

        next.on("connect_error", async (error) => {
            const message = (error as { message?: string }).message ?? "";
            const looksUnauth =
                /unauth|token|jwt|expired/i.test(message);
            if (looksUnauth) {
                // Try once to refresh — avoid an infinite loop by tearing the current socket down first.
                if (socket === next) { socket = null; }
                connectingPromise = null;
                next.disconnect();
                await reconnectWithFreshToken();
                return;
            }

            // Visibility for non-auth failures: helpful during proxy/CORS/path issues.
            if (isDev) {
                // eslint-disable-next-line no-console
                console.warn("[socket] connect_error", { message, error });

                // const now = Date.now();
                // if (now - lastConnectErrorToastAt > 10_000) {
                //     lastConnectErrorToastAt = now;
                //     toast.error(
                //         message
                //             ? `Chat connection failed: ${message}`
                //             : "Chat connection failed. Check console for details."
                //     );
                // }
            }
        });

        socket = next;
        return next;
    })();

    try {
        return await connectingPromise;
    } finally {
        connectingPromise = null;
    }
}

export const connectSocket = (): Socket => {
    if (socket?.connected) { return socket; }
    // Fire-and-forget: most callers don't need the resolved socket immediately.
    void connectSocketAsync();
    // Return a placeholder if no socket yet; callers should rely on event listeners.
    if (!socket) {
        socket = io(getSocketUrl(), { autoConnect: false });
    }
    return socket;
};

/** Acquire a chat-socket lease. Connects on first acquire; idempotent across panels. */
export const acquireChatSocket = (): void => {
    consumerCount += 1;
    void connectSocketAsync();
};

/** Release a chat-socket lease. Disconnects only when the last consumer unmounts. */
export const releaseChatSocket = (): void => {
    consumerCount = Math.max(0, consumerCount - 1);
    if (consumerCount === 0 && socket) {
        socket.disconnect();
        socket = null;
        connectingPromise = null;
    }
};

export const disconnectSocket = () => {
    consumerCount = 0;
    if (socket) {
        socket.disconnect();
        socket = null;
        connectingPromise = null;
    }
};

export const getSocket = (): Socket | null => socket;

const ensureConnectedAndEmit = (event: string, payload: unknown) => {
    if (!socket) {
        void connectSocketAsync().then((s) => s.emit(event, payload));
        return;
    }
    if (socket.connected) {
        socket.emit(event, payload);
    } else {
        socket.once("connect", () => socket?.emit(event, payload));
    }
};

export const joinConversation = (conversationId: string) => {
    ensureConnectedAndEmit("joinConversation", { conversationId });
};

export const leaveConversation = (conversationId: string) => {
    socket?.emit("leaveConversation", { conversationId });
};

export const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    socket?.emit("typing", { conversationId, isTyping });
};

export const markMessageAsRead = (conversationId: string, messageId: string) => {
    socket?.emit("markAsRead", { conversationId, messageId });
};

// Re-export types
export type NewMessageEvent = WsNewMessageEvent;
export type MessageProcessingEvent = WsMessageProcessingEvent;
export type TypingEvent = WsTypingEvent;
export type MessageReadEvent = WsMessageReadEvent;

const subscribe = <T>(event: string, callback: (data: T) => void) => {
    const attach = (s: Socket) => {
        s.on(event, callback as (...args: unknown[]) => void);
    };
    if (socket) {
        attach(socket);
    } else {
        void connectSocketAsync().then(attach);
    }
    return () => socket?.off(event, callback as (...args: unknown[]) => void);
};

export const onNewMessage = (callback: (data: NewMessageEvent) => void) =>
    subscribe<NewMessageEvent>("newMessage", callback);
export const onMessageProcessing = (callback: (data: MessageProcessingEvent) => void) =>
    subscribe<MessageProcessingEvent>("messageProcessing", callback);
export const onTyping = (callback: (data: TypingEvent) => void) =>
    subscribe<TypingEvent>("typing", callback);
export const onMessageRead = (callback: (data: MessageReadEvent) => void) =>
    subscribe<MessageReadEvent>("messageRead", callback);

/**
 * Token-by-token streaming for the assistant's final answer. Emitted from
 * llm.processor → executeReactLoop's streamSink (one event per token delta).
 */
export type ChatChunkEvent = {
    conversationId: string;
    userMessageId?: string;
    jobId?: string;
    seq: number;
    delta: string;
};

export const onChatChunk = (callback: (data: ChatChunkEvent) => void) =>
    subscribe<ChatChunkEvent>("chatChunk", callback);
