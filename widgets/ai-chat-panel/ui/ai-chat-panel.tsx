"use client";

import * as React from "react";
import { Plus, MessageSquare, Loader2, PanelLeftClose, PanelLeftOpen, ArrowUp, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { llmMarkdownToHtml } from "@/lib/llm-format";
import {
    useCreateConversation,
    useListConversations,
    useListMessages,
    useSendMessage,
} from "@/entities/chat";
import {
    acquireChatSocket,
    joinConversation,
    leaveConversation,
    onChatChunk,
    onMessageProcessing,
    onNewMessage,
    releaseChatSocket,
} from "@/lib/socket";
import { ChatRole, ConversationType } from "@/types/enum";
import type { ChatMessageWithDetails } from "@/types/api-types";
import { useAuthStore } from "@/entities/auth";
import { streamJobStatus, type JobStatusEvent, type SseSubscription } from "@/lib/sse";

export type AiChatScope =
    | { kind: "project"; projectId: string }
    | { kind: "org"; organizationId: string };

type StreamingState = {
    buffer: string;
    jobId: string | null;
};

/**
 * Optimistic record of the user's most recently sent message + the assistant's pending state.
 * Cleared when the server-emitted `newMessage` arrives (which triggers a refetch that surfaces the
 * persisted rows). Lets the UI render the user's bubble + a "thinking…" placeholder *immediately*
 * after send, instead of waiting for HTTP/socket round-trips.
 */
type PendingExchange = {
    userText: string;
    sentAt: number;
} | null;

function MarkdownMessage({
    markdown,
    className,
}: {
    markdown: string;
    className?: string;
}) {
    const [html, setHtml] = React.useState<string>("");

    React.useEffect(() => {
        let cancelled = false;
        void llmMarkdownToHtml(markdown).then((out) => {
            if (cancelled) { return; }
            setHtml(out);
        });
        return () => { cancelled = true; };
    }, [markdown]);

    if (!markdown) { return null; }

    return (
        <div
            className={cn("ovlox-markdown text-foreground wrap-break-word", className)}
            // Sanitized by `llmMarkdownToHtml` (marked + sanitize-html allowlist).
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

function formatTime(d: Date): string {
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) { return "just now"; }
    if (diffMin < 60) { return `${diffMin}m ago`; }
    if (diffMin < 1440) { return `${Math.floor(diffMin / 60)}h ago`; }
    return d.toLocaleDateString();
}

function resizeChatComposerTextarea(el: HTMLTextAreaElement | null) {
    if (!el) { return; }
    const maxPx = 160; // `max-h-40` (10rem) in pixels
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
}

/**
 * Renders the RAG chat UI. Project scope creates RAG_CHAT conversations bound to a project;
 * org scope creates ORG conversations. The component handles auto-creation of the first
 * conversation, conversation switching, message fetching, sending, and live streaming via
 * the chat socket.
 *
 * - `compact = true` collapses the conversation list and tightens spacing for the drawer.
 * - `showConversationList = false` hides the sidebar entirely (forces single-conversation mode).
 */
export function AiChatPanel({
    scope,
    compact = false,
    showConversationList = true,
    className,
    height = "h-full",
}: {
    scope: AiChatScope;
    compact?: boolean;
    showConversationList?: boolean;
    className?: string;
    /** Tailwind height utility — caller chooses fixed vs viewport-relative. */
    height?: string;
}) {
    const sessionUser = useAuthStore((s) => s.auth.user);
    const isProject = scope.kind === "project";
    const projectId = isProject ? scope.projectId : undefined;
    const organizationId = !isProject ? scope.organizationId : undefined;

    const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
    const [messageInput, setMessageInput] = React.useState("");
    const [streaming, setStreaming] = React.useState<StreamingState>({ buffer: "", jobId: null });
    const [pending, setPending] = React.useState<PendingExchange>(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const composerTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const userNearBottomRef = React.useRef(true);
    const sseRef = React.useRef<SseSubscription | null>(null);
    const sseJobIdRef = React.useRef<string | null>(null);
    const sseFallbackTimerRef = React.useRef<number | null>(null);
    const socketSawChunkForJobRef = React.useRef<Record<string, boolean>>({});

    const { data: conversations, isLoading: convosLoading, refetch: refetchConversations } = useListConversations(
        isProject ? { projectId } : { organizationId },
    );
    const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useListMessages(
        activeConversationId ?? undefined,
    );
    const { mutate: createConversation, isPending: creatingConversation } = useCreateConversation();
    const { mutate: sendMessage, isPending: sending } = useSendMessage(activeConversationId ?? "");

    const deferClearOptimisticAfterRefetch = React.useCallback(() => {
        let cleared = false;
        const clear = () => {
            if (cleared) { return; }
            cleared = true;
            setStreaming({ buffer: "", jobId: null });
            setPending(null);
        };

        const timer = window.setTimeout(clear, 500);
        void refetchMessages().finally(() => {
            window.clearTimeout(timer);
            clear();
        });
    }, [refetchMessages]);

    const newConversationPayload = React.useCallback(
        (title: string) => {
            if (isProject) {
                return { projectId: projectId!, type: ConversationType.RAG_CHAT, title };
            }
            return { organizationId: organizationId!, type: ConversationType.ORG, title };
        },
        [isProject, projectId, organizationId],
    );

    /** Auto-select the first conversation, or auto-create a default one. */
    React.useEffect(() => {
        if (!isProject && !organizationId) { return; }
        if (isProject && !projectId) { return; }
        if (!conversations) { return; }
        if (activeConversationId) { return; }
        if (conversations.length > 0) {
            setActiveConversationId(conversations[0].id);
            return;
        }
        if (creatingConversation) { return; }
        createConversation(newConversationPayload(isProject ? "Project chat" : "Org chat"), {
            onSuccess: (created) => {
                setActiveConversationId(created.id);
                refetchConversations();
            },
            onError: (err) => toast.error("Failed to create chat", { description: (err as Error).message }),
        });
    }, [
        activeConversationId,
        conversations,
        creatingConversation,
        createConversation,
        isProject,
        projectId,
        organizationId,
        refetchConversations,
        newConversationPayload,
    ]);

    React.useEffect(() => {
        acquireChatSocket();
        return () => {
            if (sseFallbackTimerRef.current) {
                window.clearTimeout(sseFallbackTimerRef.current);
                sseFallbackTimerRef.current = null;
            }
            sseRef.current?.unsubscribe();
            sseRef.current = null;
            sseJobIdRef.current = null;
            releaseChatSocket();
        };
    }, []);

    React.useEffect(() => {
        if (!activeConversationId) { return; }
        joinConversation(activeConversationId);
        // Switching conversations should drop any leftover optimistic state from the previous one.
        setPending(null);
        setStreaming({ buffer: "", jobId: null });
        setShowJumpToLatest(false);
        userNearBottomRef.current = true;
        // Force scroll to the latest message on conversation switch.
        window.requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        });
        socketSawChunkForJobRef.current = {};
        if (sseFallbackTimerRef.current) {
            window.clearTimeout(sseFallbackTimerRef.current);
            sseFallbackTimerRef.current = null;
        }
        sseRef.current?.unsubscribe();
        sseRef.current = null;
        sseJobIdRef.current = null;

        const offChunk = onChatChunk((evt) => {
            if (evt.conversationId !== activeConversationId) { return; }
            if (evt.jobId) {
                socketSawChunkForJobRef.current[evt.jobId] = true;
                if (sseFallbackTimerRef.current) {
                    window.clearTimeout(sseFallbackTimerRef.current);
                    sseFallbackTimerRef.current = null;
                }
            }
            // SSE-first: if we're actively streaming this job via SSE, ignore socket chunks to avoid
            // duplicated/competing deltas.
            if (evt.jobId && sseJobIdRef.current === evt.jobId) { return; }
            setStreaming((prev) => ({ buffer: prev.buffer + evt.delta, jobId: evt.jobId ?? prev.jobId }));
        });
        const offNew = onNewMessage((evt) => {
            if (evt.conversationId !== activeConversationId) { return; }
            deferClearOptimisticAfterRefetch();
            if (sseFallbackTimerRef.current) {
                window.clearTimeout(sseFallbackTimerRef.current);
                sseFallbackTimerRef.current = null;
            }
            sseRef.current?.unsubscribe();
            sseRef.current = null;
            sseJobIdRef.current = null;
        });
        const offProcessing = onMessageProcessing((evt) => {
            if (evt.conversationId !== activeConversationId) { return; }
            if (evt.status === "failed") {
                const description = typeof evt.error === "string" && evt.error
                    ? evt.error
                    : "Try again.";
                toast.error("Chat processing failed", { description });
                setStreaming({ buffer: "", jobId: null });
                setPending(null);
                if (sseFallbackTimerRef.current) {
                    window.clearTimeout(sseFallbackTimerRef.current);
                    sseFallbackTimerRef.current = null;
                }
                sseRef.current?.unsubscribe();
                sseRef.current = null;
                sseJobIdRef.current = null;
            }
        });

        return () => {
            leaveConversation(activeConversationId);
            offChunk?.();
            offNew?.();
            offProcessing?.();
        };
    }, [activeConversationId, deferClearOptimisticAfterRefetch]);

    const isNearBottom = React.useCallback((el: HTMLElement) => {
        const thresholdPx = 80;
        const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
        return remaining <= thresholdPx;
    }, []);

    React.useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) { return; }

        const shouldAutoScroll = userNearBottomRef.current || isNearBottom(el);
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowJumpToLatest(false);
        } else {
            // New content came in while the user is reading older messages.
            setShowJumpToLatest(true);
        }
    }, [messages, streaming.buffer, pending, isNearBottom]);

    const handleSend = () => {
        const text = messageInput.trim();
        if (!text || !activeConversationId || sending) { return; }
        if (sseFallbackTimerRef.current) {
            window.clearTimeout(sseFallbackTimerRef.current);
            sseFallbackTimerRef.current = null;
        }
        sseRef.current?.unsubscribe();
        sseRef.current = null;
        sseJobIdRef.current = null;

        setStreaming({ buffer: "", jobId: null });
        setPending({ userText: text, sentAt: Date.now() });
        setMessageInput("");
        // Sending is an explicit "take me to the latest" action even if the user was scrolled up.
        userNearBottomRef.current = true;
        window.requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        sendMessage(
            { question: text },
            {
                onSuccess: (res) => {
                    refetchMessages();
                    const jobId = res?.jobId;
                    if (!jobId) { return; }

                    setStreaming((prev) => ({ ...prev, jobId }));
                    socketSawChunkForJobRef.current[jobId] = false;

                    const startSse = (id: string) => {
                        if (sseJobIdRef.current === id && sseRef.current) { return; }
                        if (sseFallbackTimerRef.current) {
                            window.clearTimeout(sseFallbackTimerRef.current);
                            sseFallbackTimerRef.current = null;
                        }
                        sseRef.current?.unsubscribe();
                        sseRef.current = null;

                        sseJobIdRef.current = id;
                        const onEvent = (evt: JobStatusEvent) => {
                            if (!evt || typeof evt !== "object") { return; }
                            if ("jobId" in evt && evt.jobId !== id) { return; }

                            if ("kind" in evt && evt.kind === "chunk") {
                                setStreaming((prev) => ({ buffer: prev.buffer + evt.delta, jobId: id }));
                                return;
                            }
                            if ("kind" in evt && evt.kind === "answer") {
                                sseRef.current?.unsubscribe();
                                sseRef.current = null;
                                sseJobIdRef.current = null;
                                deferClearOptimisticAfterRefetch();
                            }
                        };

                        sseRef.current = streamJobStatus(
                            id,
                            onEvent,
                            () => {
                                // If SSE errors (backend down, auth, etc.), stop it quietly and let the user retry.
                                sseRef.current?.unsubscribe();
                                sseRef.current = null;
                                sseJobIdRef.current = null;
                            },
                        );
                    };

                    // SSE-first: start immediately per jobId. Socket events are kept for non-stream
                    // lifecycle (e.g. `newMessage`), but deltas should come from SSE.
                    startSse(jobId);
                },
                onError: (err) => {
                    toast.error("Failed to send", { description: (err as Error).message });
                    setPending(null);
                    setMessageInput(text);
                },
            },
        );
    };

    const handleNewConversation = () => {
        createConversation(newConversationPayload(`Chat ${new Date().toLocaleString()}`), {
            onSuccess: (created) => {
                setActiveConversationId(created.id);
                refetchConversations();
            },
            onError: (err) => toast.error("Failed to create chat", { description: (err as Error).message }),
        });
    };

    const conversationList = React.useMemo(() => conversations ?? [], [conversations]);
    const activeConversation = React.useMemo(
        () => conversationList.find((c) => c.id === activeConversationId) ?? null,
        [conversationList, activeConversationId],
    );

    const emptyStatePrompts = React.useMemo(() => {
        if (isProject) {
            return [
                "Summarize the project’s architecture and main modules.",
                "Where is authentication handled, and how does it work end-to-end?",
                "List the key API endpoints and what each one does.",
                "Help me debug an issue: the UI is slow when opening the dashboard.",
            ];
        }
        return [
            "What are the most important projects and systems in this org?",
            "How do we deploy services, and where can I see CI/CD status?",
            "Where are user roles/permissions defined and enforced?",
            "Draft a short onboarding checklist for a new engineer here.",
        ];
    }, [isProject]);

    const fillComposer = React.useCallback((text: string) => {
        setMessageInput(text);
        window.setTimeout(() => {
            const el = composerTextareaRef.current;
            if (!el) { return; }
            el.focus();
            const end = el.value.length;
            try { el.setSelectionRange(end, end); } catch { /* ignore */ }
        }, 0);
    }, []);

    return (
        <div className={cn("flex bg-background overflow-hidden", height, className)}>
            <ConversationSidebar
                show={showConversationList}
                conversations={conversationList}
                loading={convosLoading}
                activeConversationId={activeConversationId}
                onSelect={(id) => {
                    setActiveConversationId(id);
                    setMobileSidebarOpen(false);
                }}
                onNewConversation={handleNewConversation}
                creatingConversation={creatingConversation}
                mobileOpen={mobileSidebarOpen}
                onMobileOpenChange={setMobileSidebarOpen}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <ChatHeader
                    compact={compact}
                    isProject={isProject}
                    activeConversationTitle={activeConversation?.title ?? null}
                    onNewConversation={handleNewConversation}
                    creatingConversation={creatingConversation}
                    showConversationList={showConversationList}
                    onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                />

                <div
                    ref={scrollAreaRef}
                    onScroll={() => {
                        const el = scrollAreaRef.current;
                        if (!el) { return; }
                        const near = isNearBottom(el);
                        userNearBottomRef.current = near;
                        if (near) { setShowJumpToLatest(false); }
                    }}
                    className={cn("custom-scrollbar flex-1 overflow-y-auto space-y-3 relative", compact ? "p-3" : "p-4")}
                >
                    {(() => {
                        const messageCount = messages?.length ?? 0;
                        if (messagesLoading && messageCount === 0) {
                            return (
                                <div className="flex justify-center py-8 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin" />
                                </div>
                            );
                        }
                        return null;
                    })()}
                    {(messages?.length ?? 0) === 0 && !streaming.buffer && !messagesLoading ? (
                        <div className="flex h-full items-center justify-center p-6">
                            <div className="w-full max-w-xl rounded-2xl bg-card shadow-sm ring-1 ring-border/40 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 rounded-2xl bg-muted/60 ring-1 ring-border/40 p-3">
                                        <MessageSquare className="size-5 text-foreground/80" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-foreground">
                                            {isProject ? "Ask anything about this project" : "Ask anything across your organization"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {isProject
                                                ? "Get answers grounded in your integrated data and code."
                                                : "Get quick context, links, and next steps across teams and systems."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Try one of these
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {emptyStatePrompts.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => fillComposer(p)}
                                                className={cn(
                                                    "text-left",
                                                    "px-3 py-1.5 rounded-full",
                                                    "bg-background hover:bg-muted",
                                                    "ring-1 ring-border/40",
                                                    "text-xs text-foreground",
                                                    "transition-colors",
                                                )}
                                                title="Click to fill the composer"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        (messages ?? []).map((m, idx) => (
                            <MessageRow
                                key={m.id}
                                message={m}
                                index={idx}
                                messages={messages ?? []}
                                currentUserId={sessionUser?.id}
                                compact={compact}
                            />
                        ))
                    )}
                    {pending ? (
                        <UserBubble
                            text={pending.userText}
                            compact={compact}
                            meta="sending…"
                        />
                    ) : null}
                    {streaming.buffer ? (
                        <AssistantRow
                            compact={compact}
                            markdown={streaming.buffer}
                            meta="streaming…"
                            showBadge
                            enableCopy={false}
                            showHoverTime={false}
                            trailingCaret
                        />
                    ) : pending ? (
                        <AssistantRow
                            compact={compact}
                            markdown=""
                            meta="thinking…"
                            showBadge
                            enableCopy={false}
                            showHoverTime={false}
                            placeholderDots
                        />
                    ) : null}

                    {showJumpToLatest ? (
                        <div className="sticky bottom-4 z-10 flex justify-center pointer-events-none">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full shadow-sm ring-1 ring-border/40 pointer-events-auto"
                                onClick={() => {
                                    userNearBottomRef.current = true;
                                    const el = scrollAreaRef.current;
                                    if (el) {
                                        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                                    } else {
                                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                    }
                                    setShowJumpToLatest(false);
                                }}
                            >
                                Jump to latest ↓
                            </Button>
                        </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                </div>

                <ChatComposer
                    compact={compact}
                    disabled={!activeConversationId || sending}
                    placeholder={activeConversationId ? "Ask a question…" : "Loading…"}
                    value={messageInput}
                    onChange={setMessageInput}
                    onSend={handleSend}
                    sending={sending}
                    textareaRef={composerTextareaRef}
                />
            </div>
        </div>
    );
}

function ConversationSidebar({
    show,
    conversations,
    loading,
    activeConversationId,
    onSelect,
    onNewConversation,
    creatingConversation,
    mobileOpen,
    onMobileOpenChange,
}: {
    show: boolean;
    conversations: { id: string; title?: string | null }[];
    loading: boolean;
    activeConversationId: string | null;
    onSelect: (id: string) => void;
    onNewConversation: () => void;
    creatingConversation: boolean;
    mobileOpen: boolean;
    onMobileOpenChange: (open: boolean) => void;
}) {
    const storageKey = "ovlox.chat.sidebarCollapsed";
    const [collapsed, setCollapsed] = React.useState(false);

    React.useEffect(() => {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw === "1") { setCollapsed(true); }
            if (raw === "0") { setCollapsed(false); }
        } catch {
            // ignore
        }
    }, []);

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try { window.localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* ignore */ }
            return next;
        });
    };

    if (!show) { return null; }

    const isRail = collapsed;
    const renderSidebarInner = (forMobile: boolean) => (
        <>
            <div
                className={cn(
                    "p-2 border-b border-border",
                    isRail && !forMobile
                        ? "flex flex-col items-center gap-2"
                        : "flex items-center justify-between gap-2",
                )}
            >
                <div className={cn("min-w-0", collapsed && !forMobile ? "sr-only" : "")}>
                    <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Conversations</h2>
                </div>
                <div className={cn("flex gap-1", isRail && !forMobile ? "flex-col items-center" : "items-center")}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                            onNewConversation();
                            if (forMobile) { onMobileOpenChange(false); }
                        }}
                        disabled={creatingConversation}
                        title="New conversation"
                    >
                        <Plus className="size-4" />
                    </Button>
                    {!forMobile ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={toggleCollapsed}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onMobileOpenChange(false)}
                            title="Close"
                        >
                            <PanelLeftClose className="size-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loading ? (
                    <div className={cn("p-3 text-xs text-muted-foreground", (collapsed && !forMobile) ? "px-1" : "")}>Loading…</div>
                ) : conversations.length === 0 ? (
                    <div className={cn("p-3 text-xs text-muted-foreground", (collapsed && !forMobile) ? "px-1" : "")}>No conversations yet.</div>
                ) : (
                    conversations.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className={cn(
                                "w-full text-left rounded-md text-xs transition-colors flex items-center gap-2",
                                (collapsed && !forMobile) ? "px-2 py-2 justify-center" : "px-2 py-1.5",
                                c.id === activeConversationId
                                    ? "bg-accent-contrast text-text"
                                    : "hover:bg-muted text-muted-foreground",
                            )}
                            title={c.title || "Untitled"}
                            type="button"
                        >
                            <MessageSquare className="size-3.5 shrink-0" />
                            {(collapsed && !forMobile) ? null : <span className="truncate">{c.title || "Untitled"}</span>}
                        </button>
                    ))
                )}
            </div>
        </>
    );

    return (
        <>
            <aside
                className={cn(
                    "hidden md:flex border border-border flex-col shrink-0 overflow-hidden",
                    "transition-[width] duration-200 ease-out",
                    collapsed ? "w-12" : "w-72",
                )}
            >
                {renderSidebarInner(false)}
            </aside>

            {mobileOpen ? (
                <div className="md:hidden fixed inset-0 z-50">
                    <button
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        aria-label="Close conversations"
                        onClick={() => onMobileOpenChange(false)}
                        type="button"
                    />
                    <aside className={cn(
                        "absolute left-0 top-0 h-full w-72 bg-background border-r border-border shadow-lg",
                        "flex flex-col",
                    )}
                    >
                        {renderSidebarInner(true)}
                    </aside>
                </div>
            ) : null}
        </>
    );
}

function ChatHeader({
    compact,
    isProject,
    activeConversationTitle,
}: {
    compact: boolean;
    isProject: boolean;
    activeConversationTitle: string | null;
    onNewConversation: () => void;
    creatingConversation: boolean;
    showConversationList: boolean;
    onOpenMobileSidebar: () => void;
}) {
    if (compact) { return null; }

    return (
        <div className="px-3 py-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="font-semibold text-sm flex items-center gap-2 min-w-0">
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="truncate">{activeConversationTitle || (isProject ? "Project AI Chat" : "Org AI Chat")}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {isProject
                        ? "Ask questions about your project. Answers reference your integrated data."
                        : "Ask questions across your organization."}
                </p>
            </div>
        </div>
    );
}

function ChatComposer({
    compact,
    disabled,
    placeholder,
    value,
    onChange,
    onSend,
    sending,
    textareaRef,
}: {
    compact: boolean;
    disabled: boolean;
    placeholder: string;
    value: string;
    onChange: (next: string) => void;
    onSend: () => void;
    sending: boolean;
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
    const innerTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const resolvedTextareaRef = textareaRef ?? innerTextareaRef;

    React.useEffect(() => {
        resizeChatComposerTextarea(resolvedTextareaRef.current);
    }, [value, resolvedTextareaRef]);

    const showHelper = !compact && !sending && !value.trim();

    return (
        <div className={cn(compact ? "p-2" : "p-4")}>
            <div className="relative rounded-2xl bg-card shadow-sm ring-1 ring-border/40 px-3 py-2">
                <textarea
                    ref={resolvedTextareaRef}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onInput={() => resizeChatComposerTextarea(resolvedTextareaRef.current)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                    disabled={disabled}
                    rows={1}
                    className={cn(
                        "w-full resize-none bg-transparent outline-none",
                        "min-h-12 max-h-40 overflow-y-auto custom-scrollbar",
                        compact ? "text-xs" : "text-sm",
                        "pr-12",
                    )}
                />

                <Button
                    type="button"
                    size="icon"
                    onClick={onSend}
                    disabled={disabled || !value.trim()}
                    className={cn(
                        "absolute right-2 bottom-2 rounded-full",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>

                {showHelper ? (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                        Enter to send · Shift+Enter for newline
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function MessageRow({
    message,
    index,
    messages,
    currentUserId,
    compact,
}: {
    message: ChatMessageWithDetails;
    index: number;
    messages: ChatMessageWithDetails[];
    currentUserId?: string;
    compact?: boolean;
}) {
    const isAssistant = message.role === ChatRole.ASSISTANT;
    const isOwn = !isAssistant && !!currentUserId && message.sender?.id === currentUserId;
    const ts = message.createdAt ? new Date(message.createdAt) : new Date();
    const prev = index > 0 ? messages[index - 1] : null;
    const isGroupStart = !prev || prev.role !== message.role;

    if (isAssistant) {
        return (
            <AssistantRow
                compact={!!compact}
                markdown={message.content}
                showBadge={isGroupStart}
                timeLabel={isGroupStart ? formatTime(ts) : undefined}
                showHoverTime
                enableCopy
            />
        );
    }

    return (
        <UserBubble
            text={message.content}
            compact={!!compact}
            timeLabel={isGroupStart ? formatTime(ts) : undefined}
            // Keep "You" semantics even if sender metadata is missing.
            label={isOwn || !message.sender ? "You" : [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(" ") || "You"}
        />
    );
}

function UserBubble({
    text,
    compact,
    timeLabel,
    label = "You",
    meta,
}: {
    text: string;
    compact: boolean;
    timeLabel?: string;
    label?: string;
    meta?: string;
}) {
    return (
        <div className="flex justify-end group">
            <div className="max-w-[75%] min-w-0">
                <div className="flex items-baseline justify-end gap-2 mb-1">
                    <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{label}</p>
                    {meta ? <p className="text-[10px] text-muted-foreground">{meta}</p> : null}
                    {timeLabel ? (
                        <p className="text-[10px] text-muted-foreground opacity-100">
                            {timeLabel}
                        </p>
                    ) : null}
                </div>
                <div
                    className={cn(
                        "rounded-2xl shadow-sm",
                        "bg-primary text-primary-foreground",
                        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
                        "whitespace-pre-wrap wrap-break-word",
                    )}
                >
                    {text}
                </div>
            </div>
        </div>
    );
}

function AssistantRow({
    compact,
    markdown,
    meta,
    timeLabel,
    showBadge,
    showHoverTime,
    enableCopy,
    trailingCaret,
    placeholderDots,
}: {
    compact: boolean;
    markdown: string;
    meta?: string;
    timeLabel?: string;
    showBadge: boolean;
    showHoverTime: boolean;
    enableCopy: boolean;
    trailingCaret?: boolean;
    placeholderDots?: boolean;
}) {
    return (
        <div className="group relative">
            <div className="flex gap-3">
                <div className={cn("shrink-0", compact ? "pt-0.5" : "pt-1")}>
                    {showBadge ? (
                        <div
                            className={cn(
                                "inline-flex items-center justify-center",
                                "h-6 w-6 rounded-full",
                                "bg-accent-contrast text-accent-foreground",
                                "ring-1 ring-border/40",
                                "text-[10px] font-semibold text-foreground/90",
                            )}
                            title="AI"
                        >
                            AI
                        </div>
                    ) : (
                        <div className="w-8" aria-hidden />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {showBadge ? (
                        <div className="flex items-baseline gap-2 mb-1">
                            <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>Assistant</p>
                            {meta ? <p className="text-[10px] text-muted-foreground">{meta}</p> : null}
                        </div>
                    ) : null}

                    {placeholderDots ? (
                        <div className="flex items-center gap-1 py-2">
                            <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    ) : (
                        <div className="relative">
                            <MarkdownMessage markdown={markdown} className={cn(compact ? "text-xs" : "text-sm")} />
                            {trailingCaret ? (
                                <span className="inline-block w-1 h-4 bg-foreground/60 align-middle ml-0.5 animate-pulse" />
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {showHoverTime && timeLabel ? (
                    <div className="pointer-events-none absolute left-10 -bottom-7 opacity-100">
                        <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                    </div>
                ) : null}

                {enableCopy ? (
                    <button
                        type="button"
                        className={cn(
                            "absolute left-20",
                            showBadge ? "-bottom-8" : "top-0",
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            "h-7 w-7 inline-flex items-center justify-center rounded-md",
                            "hover:bg-muted text-muted-foreground hover:text-foreground",
                        )}
                        title="Copy answer"
                        onClick={() => {
                            void navigator.clipboard.writeText(markdown).then(
                                () => toast.success("Copied"),
                                () => toast.error("Copy failed"),
                            );
                        }}
                    >
                        <Copy className="size-4" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}