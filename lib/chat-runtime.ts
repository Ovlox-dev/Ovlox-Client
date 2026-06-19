"use client";

import { create } from "zustand";
import { toast } from "sonner";

import {
    acquireChatSocket,
    joinConversation as socketJoinConversation,
    leaveConversation as socketLeaveConversation,
    onMessageProcessing,
    onNewMessage,
    releaseChatSocket,
} from "./socket";
import {
    streamJobStatus,
    type JobStatusEvent,
    type SseSubscription,
} from "./sse";
import { ChatRole } from "@/types/enum";

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
 *
 * Flicker prevention: when the SSE `answer` event (or the socket's assistant `newMessage`)
 * arrives, the runtime stores the persisted assistant message id rather than clearing the
 * streamed bubble immediately. The panel watches the message list and clears the runtime
 * entry only once the persisted row is actually visible — avoids a "stream → blank → row"
 * flash on the SSE/DB handoff.
 */

// ───────────────────────────────────────────────────────────────
//  Store
// ───────────────────────────────────────────────────────────────

export type StreamPending = {
    userText: string;
    sentAt: number;
    /** Filled once the send succeeds so the optimistic user bubble can be hidden as soon as
     *  the persisted user row lands in `messages`. */
    persistedUserMessageId?: string | null;
};

/** One step in the agent's live timeline (a tool call + its 1-line finding). */
export type AgentStep = {
    id: string;
    label: string;
    detail?: string;
    status: "running" | "done";
};

export type StreamState = {
    buffer: string;
    jobId: string | null;
    pending: StreamPending | null;
    /** Live agent steps (search code → finding, read graph → finding…). Persisted with the message
     *  on completion; unlike `stage`, these are kept once tokens flow so the timeline stays visible. */
    steps?: AgentStep[];
    /** When the SSE `answer` event (or socket assistant `newMessage`) arrives we stash the
     *  persisted assistant message id here. The panel keeps showing the streamed bubble
     *  until that id is visible in the `messages` query result. */
    persistedAssistantMessageId: string | null;
    /** Current agent stage (PLANNING / RETRIEVAL / TOOL_CALL / ANALYZING / GENERATING / CRITIQUE)
     *  streamed via SSE `kind:'stage'` — shown as a "thinking" hint until tokens/answer arrive. */
    stage?: string | null;
    stageDetail?: string | null;
    /** Highest stage `seq` applied so far — guards against out-of-order/duplicate stage events. */
    lastStageSeq?: number;
};

type StreamingStore = {
    byConversation: Record<string, StreamState>;
    titles: Record<string, string | undefined>;

    startPending: (conversationId: string, userText: string) => void;
    setJobId: (conversationId: string, jobId: string) => void;
    setStage: (conversationId: string, stage: string, detail?: string, seq?: number) => void;
    /** Upsert a live agent step (running → done) by id. */
    addStep: (conversationId: string, step: AgentStep) => void;
    appendChunk: (conversationId: string, delta: string) => void;
    /** Used in degraded mode (server emitted only the final answer, no chunks). */
    seedAnswerIfEmpty: (conversationId: string, answer: string) => void;
    setPersistedUserMessageId: (conversationId: string, messageId: string | null) => void;
    setPersistedAssistantMessageId: (conversationId: string, messageId: string | null) => void;
    clear: (conversationId: string) => void;
    setTitle: (conversationId: string, title?: string | null) => void;
};

const emptyStream = (): StreamState => ({
    buffer: "",
    jobId: null,
    pending: null,
    persistedAssistantMessageId: null,
});

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
                    persistedAssistantMessageId: null,
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

    setStage: (conversationId, stage, detail, seq) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            // Drop out-of-order/duplicate stage events, and ignore any stage once tokens have begun
            // (the streamed text supersedes the "thinking" hint — a late stage must not re-show it).
            if (seq !== undefined && prev.lastStageSeq !== undefined && seq <= prev.lastStageSeq) { return {}; }
            if (prev.buffer.length > 0) { return {}; }
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: { ...prev, stage, stageDetail: detail ?? null, lastStageSeq: seq ?? prev.lastStageSeq },
                },
            };
        }),

    addStep: (conversationId, step) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            const steps = [...(prev.steps ?? [])];
            const i = steps.findIndex((s) => s.id === step.id);
            if (i >= 0) { steps[i] = step; } else { steps.push(step); }
            return {
                byConversation: { ...state.byConversation, [conversationId]: { ...prev, steps } },
            };
        }),

    appendChunk: (conversationId, delta) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            return {
                byConversation: {
                    // Once tokens flow, the streamed text replaces the "thinking: <stage>" hint —
                    // but the step timeline is KEPT (steps spread via ...prev).
                    ...state.byConversation,
                    [conversationId]: { ...prev, buffer: prev.buffer + (delta ?? ""), stage: null, stageDetail: null },
                },
            };
        }),

    seedAnswerIfEmpty: (conversationId, answer) =>
        set((state) => {
            const prev = state.byConversation[conversationId];
            if (!prev || prev.buffer || !answer) { return state; }
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: { ...prev, buffer: answer },
                },
            };
        }),

    setPersistedUserMessageId: (conversationId, messageId) =>
        set((state) => {
            const prev = state.byConversation[conversationId];
            if (!prev || !prev.pending) { return state; }
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: {
                        ...prev,
                        pending: { ...prev.pending, persistedUserMessageId: messageId },
                    },
                },
            };
        }),

    setPersistedAssistantMessageId: (conversationId, messageId) =>
        set((state) => {
            const prev = state.byConversation[conversationId] ?? emptyStream();
            return {
                byConversation: {
                    ...state.byConversation,
                    [conversationId]: { ...prev, persistedAssistantMessageId: messageId },
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
// SSE is the canonical token-streaming path. We used to also subscribe to
// the socket's `chatChunk` event and dedup by jobId — that path has been
// removed entirely. Sockets stay around for non-streaming concerns
// (final-message persistence broadcast + processing-failed signals) where
// multi-panel fanout is still useful.
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

    offNew = onNewMessage((evt) => {
        const rt = conversations.get(evt.conversationId);
        if (!rt) { return; }

        const store = useChatStreamingStore.getState();
        const wasStreaming = !!store.byConversation[evt.conversationId];

        // Tear down SSE — answer is now persisted, no more chunks coming for this job.
        if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
        rt.sseJobId = null;

        const role = evt.message?.role;
        const messageId = evt.message?.id;

        // Stash persisted ids for flicker-free transition. The panel's effects watch
        // these and clear the runtime entry only once the persisted rows are visible.
        if (messageId && role === ChatRole.USER) {
            store.setPersistedUserMessageId(evt.conversationId, messageId);
        } else if (messageId && role === ChatRole.ASSISTANT) {
            store.setPersistedAssistantMessageId(evt.conversationId, messageId);
        }

        // Always invalidate so any mounted panel pulls the latest messages.
        try { onAssistantMessageReady?.({ conversationId: evt.conversationId }); } catch { /* swallow */ }

        const isAssistantArrival = role === ChatRole.ASSISTANT;

        // Toast when the assistant reply lands while no panel is visible.
        if (isAssistantArrival && wasStreaming && rt.panelRefcount === 0) {
            const title = store.titles[evt.conversationId];
            toast.success("Chat reply ready", {
                description: title ? `New reply in "${title}"` : "Open chat to view the reply",
            });
            // No panel will run the persistedAssistantMessageId watcher — clear directly.
            store.clear(evt.conversationId);
        }

        // Background-hold cleanup once the assistant message is in.
        if (isAssistantArrival && rt.panelRefcount === 0 && rt.backgroundHold) {
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
    offNew?.(); offProcessing?.();
    offNew = null; offProcessing = null;
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
 * store; the final `answer` event captures the persisted assistant message id (used by
 * the panel to clear the streamed bubble flicker-free) and seeds the buffer if no chunks
 * were delivered (degraded SSE mode).
 */
export function startConversationJob(conversationId: string, jobId: string) {
    const rt = conversations.get(conversationId);
    if (!rt) { return; }

    // Idempotency guard. The send-mutation's onSuccess can fire more than once in real
    // deployments (React StrictMode dev double-effects, hot-reload, multiple panel mounts,
    // page+drawer panels both calling handleSend for the same conversation). Without this
    // check each invocation opens its own SSE — production logs showed 9 concurrent
    // /chat/jobs/<id>/stream connections for a single send, each holding a Redis pub/sub
    // subscription on the server. Re-entering for the SAME jobId is a no-op; switching to
    // a NEW jobId still works (unsubscribes the previous and opens a new SSE).
    if (rt.sseJobId === jobId && rt.sseSub) {
        return;
    }

    if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
    rt.sseJobId = jobId;
    useChatStreamingStore.getState().setJobId(conversationId, jobId);

    rt.sseSub = streamJobStatus(
        jobId,
        (evt: JobStatusEvent) => {
            if (!evt || typeof evt !== "object") { return; }
            if ("jobId" in evt && evt.jobId !== jobId) { return; }
            const store = useChatStreamingStore.getState();
            if ("kind" in evt && evt.kind === "stage") {
                // Non-token progress (planning/retrieval/tool/critique). Shown as a "thinking" hint
                // until tokens or the final answer arrive. Additive — never blocks the chunk path.
                store.setStage(conversationId, evt.stage, evt.detail, evt.seq);
                return;
            }
            if ("kind" in evt && evt.kind === "step") {
                // A tool the agent ran (running → done + finding). Accumulates into the live timeline.
                store.addStep(conversationId, { id: evt.id, label: evt.label, detail: evt.detail, status: evt.status });
                return;
            }
            if ("kind" in evt && evt.kind === "chunk") {
                store.appendChunk(conversationId, evt.delta);
                return;
            }
            if ("kind" in evt && evt.kind === "answer") {
                if (rt.sseSub) { rt.sseSub.unsubscribe(); rt.sseSub = null; }
                rt.sseJobId = null;
                if (evt.chatMessageId) {
                    store.setPersistedAssistantMessageId(conversationId, evt.chatMessageId);
                }
                if (evt.answer) {
                    // No chunks were streamed (e.g. server fell back to non-streaming). Show
                    // the final answer so the bubble isn't permanently blank.
                    store.seedAnswerIfEmpty(conversationId, evt.answer);
                }
                // Trigger the same messages-query invalidation the socket `newMessage` handler
                // does. The SSE `answer` event always arrives before (or at the same time as)
                // the socket `newMessage`, and waiting solely on the socket meant any delay
                // there held the panel in "thinking…" state under the rendered response. Doing
                // it here too closes that gap so the clear-effect in ai-chat-panel.tsx can run
                // as soon as the persisted assistant message is fetchable.
                try { onAssistantMessageReady?.({ conversationId }); } catch { /* swallow */ }
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

/** Stash the persisted user message id (returned from the send mutation) so the optimistic
 *  user bubble can be hidden as soon as the persisted row appears in `messages`. */
export function recordPersistedUserMessageId(conversationId: string, messageId: string) {
    if (!conversationId || !messageId) { return; }
    useChatStreamingStore.getState().setPersistedUserMessageId(conversationId, messageId);
}
