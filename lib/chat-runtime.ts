"use client";

import { create } from "zustand";
import { toast } from "sonner";

import {
    acquireChatSocket,
    joinConversation as socketJoinConversation,
    leaveConversation as socketLeaveConversation,
    onChatChunk,
    onMessageProcessing,
    onNewMessage,
    releaseChatSocket,
} from "./socket";
import {
    streamJobStatus,
    type JobStatusEvent,
    type SseSubscription,
} from "./sse";

/**
 * Global runtime that owns chat streaming state across mount points.
 *
 * Why this exists: the chat UI is rendered in two places (the dedicated chat page and the
 * right-side drawer). Previously each `AiChatPanel` instance kept its own streaming buffer,
 * SSE subscription, and socket-room lifecycle. That meant:
 *   - opening the drawer while a reply was streaming on the page didn't show the same
 *     stream, because the drawer's local state was empty
 *   - closing the drawer killed the page's stream too, because both panels emitted
 *     `leaveConversation` on unmount and the server-side room membership is per-socket
 *     (not per-panel)
 *
 * The runtime hoists all of that out of the panel:
 *   - one room-join per conversation, refcounted across panels
 *   - one SSE per in-flight job
 *   - streaming state in a Zustand store (every panel reads the same buffer)
 *   - if every panel unmounts mid-stream, the runtime keeps listening and shows a toast
 *     when the answer lands
 */

// ───────────────────────────────────────────────────────────────
//  Store
// ───────────────────────────────────────────────────────────────

export type StreamState = {
    buffer: string;
    jobId: string | null;
    pending: { userText: string; sentAt: number } | null;
};

type StreamingStore = {
    byConversation: Record<string, StreamState>;
    titles: Record<string, string | undefined>;

    startPending: (conversationId: string, userText: string) => void;
    setJobId: (conversationId: string, jobId: string) => void;
    appendChunk: (conversationId: string, delta: string) => void;
    clear: (conversationId: string) => void;
    setTitle: (conversationId: string, title?: string | null) => void;
};

const emptyStream = (): StreamState => ({ buffer: "", jobId: null, pending: null });

export const useChatStreamingStore = create<StreamingStore>((set) => ({
    byConversation: {},
    titles: {},

    startPending: (conversationId, userText) =>
        set((state) => ({
            byConversation: {
                ...state.byConversation,
                [conversationId]: {
                    buffer: "",
                    jobId: null,
                    pending: { userText, sentAt: Date.now() },
                },
            },
        })),

    setJobId: (conversationId, jobId) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: { ...prev, jobId },
                },
            };
        }),

    appendChunk: (conversationId, delta) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: { ...prev, buffer: prev.buffer + delta },
                },
            };
        }),

    clear: (conversationId) =>
        set((state) => {
            if (!state.byConversation[conversationId]) { return state; }
            const next = { ...state.byConversation };
            delete next[conversationId];
            return { byConversation: next };
        }),

    setTitle: (conversationId, title) =>
        set((state) => ({
            titles: {
                ...state.titles,
                [conversationId]: title ?? undefined,
            },
        })),
}));

// ───────────────────────────────────────────────────────────────
//  Runtime
// ───────────────────────────────────────────────────────────────

type ConversationRuntime = {
    panelRefcount: number;
    /** True iff every panel has unmounted but a job is still in flight; we keep listening
     *  so we can toast the user when the answer eventually arrives. */
    backgroundHold: boolean;
    sseSub: SseSubscription | null;
    sseJobId: string | null;
};

const conversations = new Map<string, ConversationRuntime>();

let listenersInstalled = false;
let offChunk: (() => void) | null = null;
let offNew: (() => void) | null = null;
let offProcessing: (() => void) | null = null;

/** Wired from `<ChatRuntimeBridge>` so the runtime can invalidate React Query caches
 *  without holding a direct dependency on the QueryClient. */
let onAssistantMessageReady:
    | ((args: { conversationId: string }) => void)
    | null = null;

export function setOnAssistantMessageReady(
    fn: ((args: { conversationId: string }) => void) | null,
) {
    onAssistantMessageReady = fn;
}

function installListeners() {
    if (listenersInstalled) { return; }
    listenersInstalled = true;

    offChunk = onChatChunk((evt) => {
        const rt = conversations.get(evt.conversationId);
        if (!rt) { return; }
        // SSE-first: if SSE is actively streaming this job, skip the socket chunk
        // so we don't double-append deltas.
        if (evt.jobId && rt.sseJobId === evt.jobId) { return; }
        const store = useChatStreamingStore.getState();
        store.appendChunk(evt.conversationId, evt.delta);
        if (evt.jobId) { store.setJobId(evt.conversationId, evt.jobId); }
    });

    offNew = onNewMessage((evt) => {
        const rt = conversations.get(evt.conversationId);
        if (!rt) { return; }

        const wasStreaming = !!useChatStreamingStore.getState().byConversation[evt.conversationId];

        if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
        rt.sseJobId = null;
        useChatStreamingStore.getState().clear(evt.conversationId);

        try { onAssistantMessageReady?.({ conversationId: evt.conversationId }); } catch { /* swallow */ }

        if (wasStreaming && rt.panelRefcount === 0) {
            const title = useChatStreamingStore.getState().titles[evt.conversationId];
            toast.success("Chat reply ready", {
                description: title ? `New reply in "${title}"` : "Open chat to view the reply",
            });
        }

        if (rt.panelRefcount === 0 && rt.backgroundHold) {
            rt.backgroundHold = false;
            socketLeaveConversation(evt.conversationId);
            conversations.delete(evt.conversationId);
            releaseChatSocket();
            uninstallListenersIfIdle();
        }
    });

    offProcessing = onMessageProcessing((evt) => {
        const rt = conversations.get(evt.conversationId);
        if (!rt) { return; }
        if (evt.status !== "failed") { return; }

        if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
        rt.sseJobId = null;
        useChatStreamingStore.getState().clear(evt.conversationId);

        const description = typeof evt.error === "string" && evt.error ? evt.error : "Try again.";
        toast.error("Chat processing failed", { description });

        if (rt.panelRefcount === 0 && rt.backgroundHold) {
            rt.backgroundHold = false;
            socketLeaveConversation(evt.conversationId);
            conversations.delete(evt.conversationId);
            releaseChatSocket();
            uninstallListenersIfIdle();
        }
    });
}

function uninstallListenersIfIdle() {
    if (conversations.size > 0) { return; }
    if (!listenersInstalled) { return; }
    offChunk?.(); offNew?.(); offProcessing?.();
    offChunk = null; offNew = null; offProcessing = null;
    listenersInstalled = false;
}

/**
 * Refcounted reservation on a conversation. The first acquire installs the global socket
 * listeners, joins the conversation room, and acquires the chat-socket lease. Subsequent
 * acquires just bump the refcount.
 */
export function acquireConversation(conversationId: string) {
    if (!conversationId) { return; }
    const existing = conversations.get(conversationId);
    if (existing) {
        existing.panelRefcount += 1;
        // If the conversation was being held in background-only mode (panels left mid-stream),
        // a panel just remounted — clear the background flag so normal lifecycle resumes.
        existing.backgroundHold = false;
        return;
    }
    conversations.set(conversationId, {
        panelRefcount: 1,
        backgroundHold: false,
        sseSub: null,
        sseJobId: null,
    });
    acquireChatSocket();
    installListeners();
    socketJoinConversation(conversationId);
}

/**
 * Release a UI panel's hold. If a job is still in flight when the last panel unmounts,
 * we DON'T leave the room or tear down listeners — the runtime keeps watching so it can
 * toast the user when the assistant message arrives. The room is left when the answer
 * lands (in the `newMessage` listener) or the user explicitly cancels.
 */
export function releaseConversation(conversationId: string) {
    if (!conversationId) { return; }
    const rt = conversations.get(conversationId);
    if (!rt) { return; }
    rt.panelRefcount = Math.max(0, rt.panelRefcount - 1);
    if (rt.panelRefcount > 0) { return; }

    const stream = useChatStreamingStore.getState().byConversation[conversationId];
    const jobInFlight = !!(rt.sseJobId || stream?.jobId || stream?.pending);
    if (jobInFlight) {
        rt.backgroundHold = true;
        return;
    }

    socketLeaveConversation(conversationId);
    conversations.delete(conversationId);
    releaseChatSocket();
    uninstallListenersIfIdle();
}

/**
 * Open the SSE stream for an in-flight LLM job. Per-token chunks update the streaming
 * store; the final `answer` event closes the SSE. The socket's `newMessage` clears the
 * optimistic state and triggers the React-Query refetch via the bridge.
 */
export function startConversationJob(conversationId: string, jobId: string) {
    const rt = conversations.get(conversationId);
    if (!rt) { return; }

    if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
    rt.sseJobId = jobId;
    useChatStreamingStore.getState().setJobId(conversationId, jobId);

    rt.sseSub = streamJobStatus(
        jobId,
        (evt: JobStatusEvent) => {
            if (!evt || typeof evt !== "object") { return; }
            if ("jobId" in evt && evt.jobId !== jobId) { return; }
            if ("kind" in evt && evt.kind === "chunk") {
                useChatStreamingStore.getState().appendChunk(conversationId, evt.delta);
                return;
            }
            if ("kind" in evt && evt.kind === "answer") {
                if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
                rt.sseJobId = null;
            }
        },
        () => {
            // SSE error: drop quietly. Socket `newMessage` will still arrive and clear state.
            if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
            rt.sseJobId = null;
        },
    );
}

/** Record the user's just-sent message so panels show the optimistic bubble + thinking dots. */
export function recordPendingExchange(conversationId: string, userText: string) {
    useChatStreamingStore.getState().startPending(conversationId, userText);
}

/** Used by panels to surface a friendly conversation name in the completion toast. */
export function recordConversationTitle(conversationId: string, title?: string | null) {
    if (!conversationId) { return; }
    useChatStreamingStore.getState().setTitle(conversationId, title);
}
