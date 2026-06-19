import { io, Socket } from "socket.io-client";
import { getAccessToken, refreshAccessToken } from "@/shared/lib/auth/token-service";
import {
    WsNewMessageEvent,
    WsMessageProcessingEvent,
    WsTypingEvent,
    WsMessageReadEvent,
} from "@/types/api-types";
// import { apiBaseUrl } from "@/shared/api/client";
// import { toast } from "sonner";

const getSocketUrl = () => {
    // Socket.IO can't go through Next's /api/v1 rewrite (HTTP-only — Vercel and most CDNs
    // do not proxy WebSocket Upgrade). Connect to the backend's absolute origin so WS reaches
    // the real server. CORS is permissive in prod and the handshake uses auth.token (JWT in
    // payload), so cross-origin works without cookies.
    const upstream = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    return `${upstream.replace(/\/api\/v1$/, "").replace(/\/+$/, "")}/chat`;
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
 * Registry of active domain-event subscriptions (newMessage / messageProcessing /
 * conversationUpdated / typing / messageRead). Stored so they can be re-attached to a
 * brand-new io() instance after a token-expiry reconnect — otherwise the new socket has
 * no listeners and chat goes silent. Keyed nothing fancy: a flat list we re-attach in bulk.
 */
const activeSubscriptions = new Set<{ event: string; callback: (...args: unknown[]) => void }>();

/** Re-attach every registered domain listener to the given socket (removing first to avoid dups). */
function reattachSubscriptions(s: Socket): void {
    for (const sub of activeSubscriptions) {
        s.off(sub.event, sub.callback);
        s.on(sub.event, sub.callback);
    }
}

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
    // Refresh returns:
    //   - null       → refresh genuinely failed (HTTP error, refresh-token cookie expired, …)
    //   - "" (empty) → HTTP refresh succeeded under cookie-only auth (no Bearer in body)
    //   - non-empty  → new Bearer token available
    // We only show "Session expired" on `null` — empty string means cookies have been
    // rotated and the next handshake will pick them up. Treating `!fresh` as the failure
    // signal was producing the wrong toast in production every time access cookies hit 15min.
    // const fresh = await refreshAccessToken();
    // if (fresh === null) {
    //     toast.error("Session expired. Please sign in again.");
    //     return;
    // }
    const fresh = await connectSocketAsync();
    // The new io() instance carries none of the previous listeners — re-attach the domain
    // events so chat keeps receiving newMessage/messageProcessing/conversationUpdated/etc.
    reattachSubscriptions(fresh);
}

async function connectSocketAsync(): Promise<Socket> {
    if (socket?.connected) { return socket; }
    if (connectingPromise) { return connectingPromise; }

    connectingPromise = (async () => {
        let token = getAccessToken();
        // Pre-emptive refresh when we have no Bearer in localStorage. The handshake itself
        // can succeed with just the cookie (backend SocketGuard accepts cookie-or-Bearer),
        // but this avoids a visible "connection failed → reconnect" blip in the UI when
        // the cookie has gone stale and the handshake would have 401'd. The refresh may
        // legitimately return "" (cookie-only mode — backend doesn't include Bearer in
        // the response body); the `token ? { token } : {}` below treats that correctly
        // as "no Bearer to send in auth payload, rely on the (now-fresh) cookie".
        if (!token) {
            token = await refreshAccessToken();
        }

        const next = io(getSocketUrl(), {
            auth: token ? { token } : {},
            // Must match the backend gateway's `path` (chat.gateway.ts / app.gateway.ts).
            // The NestJS global prefix /api/v1 doesn't apply to WS gateways, so we set the
            // socket.io path manually to keep WS behind the same proxy/CDN routing as HTTP.
            path: "/api/v1/socket.io",
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
        socket = io(getSocketUrl(), { autoConnect: false, path: "/api/v1/socket.io" });
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
    const sub = { event, callback: callback as (...args: unknown[]) => void };
    // Register so the listener is re-attached after a token-expiry reconnect (new io() instance).
    activeSubscriptions.add(sub);
    const attach = (s: Socket) => {
        // Remove before adding to guarantee no duplicate listeners on the same socket.
        s.off(event, sub.callback);
        s.on(event, sub.callback);
    };
    if (socket) {
        attach(socket);
    } else {
        void connectSocketAsync().then(attach);
    }
    return () => {
        activeSubscriptions.delete(sub);
        socket?.off(event, sub.callback);
    };
};

export const onNewMessage = (callback: (data: NewMessageEvent) => void) =>
    subscribe<NewMessageEvent>("newMessage", callback);
export const onMessageProcessing = (callback: (data: MessageProcessingEvent) => void) =>
    subscribe<MessageProcessingEvent>("messageProcessing", callback);
export const onTyping = (callback: (data: TypingEvent) => void) =>
    subscribe<TypingEvent>("typing", callback);
export const onMessageRead = (callback: (data: MessageReadEvent) => void) =>
    subscribe<MessageReadEvent>("messageRead", callback);

export const onConversationUpdated = (callback: (data: { conversationId: string; title: string | null }) => void) =>
    subscribe<{ conversationId: string; title: string | null }>("conversationUpdated", callback);

/**
 * NOTE: token-streaming has migrated entirely to SSE (`lib/sse.ts streamJobStatus`).
 * The backend may still emit a `chatChunk` socket event — there is intentionally no
 * listener wired up here so the frontend treats SSE as the single source of truth
 * for token deltas. Production SSE buffering issues that previously made sockets
 * the de-facto streaming channel are addressed by routing SSE direct to the API
 * origin via `apiAbsoluteUrl` (bypasses Next.js rewrites).
 */