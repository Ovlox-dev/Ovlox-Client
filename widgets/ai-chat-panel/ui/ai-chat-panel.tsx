"use client";

import * as React from "react";
import { Plus, MessageSquare, Loader2, PanelLeftClose, PanelLeftOpen, ArrowUp, Copy, Check, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { ChatRole, ConversationType } from "@/types/enum";
import type { ChatMessageWithDetails } from "@/types/api-types";
import { useAuthStore } from "@/entities/auth";
import {
    acquireConversation,
    recordConversationTitle,
    recordPendingExchange,
    recordPersistedUserMessageId,
    releaseConversation,
    startConversationJob,
    useChatStreamingStore,
    type AgentStep,
} from "@/lib/chat-runtime";
import {
    buildScopeKey,
    useChatSidebarStore,
} from "@/shared/lib/chat-sidebar/chat-sidebar.store";

export type AiChatScope =
    | { kind: "project"; projectId: string }
    | { kind: "org"; organizationId: string };

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


/**
 * Renders the RAG chat UI. Project scope creates RAG_CHAT conversations bound to a project;
 * org scope creates ORG conversations. The component handles auto-creation of the first
 * conversation, conversation switching, message fetching, sending, and live streaming via
 * the chat socket.
 *
 * Streaming state, optimistic pending state, the SSE subscription, and the conversation
 * room membership all live in `lib/chat-runtime.ts`. That makes the dedicated chat page and
 * the right-side drawer share one stream + one socket room — opening/closing the drawer
 * doesn't disturb the page's in-flight reply, and if both unmount mid-stream the user gets
 * a toast when the answer lands.
 *
 * - `compact = true` collapses the conversation list and tightens spacing for the drawer.
 * - `showConversationList = false` hides the sidebar entirely (forces single-conversation mode).
 */

/** Map a streamed agent stage to a friendly "thinking" label. Falls back to "thinking…". */
function stageToLabel(stage?: string | null, detail?: string | null): string {
    switch (stage) {
        case "PLANNING": return "planning…";
        case "RETRIEVAL": return detail ? `retrieving · ${detail}` : "retrieving…";
        case "TOOL_CALL": return detail ? `using ${detail}…` : "using tools…";
        case "ANALYZING": return "analyzing…";
        case "GENERATING": return "generating…";
        case "CRITIQUE": return "reviewing…";
        default: return "thinking…";
    }
}

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

    /**
     * `activeConversationId` lives in `useChatSidebarStore` keyed by scope so
     * external surfaces (the ChatSidebar header's conversation dropdown) can
     * drive selection without prop-drilling, and a user's last-active chat
     * survives navigation away and back.
     *
     * The setter wrapper packages the per-scope shape so callers inside this
     * component can keep writing `setActiveConversationId(id)` as if it were
     * still `useState`.
     */
    const scopeKey = React.useMemo(() => buildScopeKey(scope), [scope]);
    const activeConversationId = useChatSidebarStore((s) =>
        scopeKey ? s.activeConversationByScope[scopeKey] ?? null : null,
    );
    const setActiveConversationInStore = useChatSidebarStore((s) => s.setActiveConversation);
    const setActiveConversationId = React.useCallback(
        (next: string | null | ((prev: string | null) => string | null)) => {
            if (!scopeKey) { return; }
            const nextValue = typeof next === "function" ? next(activeConversationId) : next;
            setActiveConversationInStore(scopeKey, nextValue);
        },
        [scopeKey, activeConversationId, setActiveConversationInStore],
    );
    const [messageInput, setMessageInput] = React.useState("");
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const composerTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const userNearBottomRef = React.useRef(true);
    const didInitialScrollRef = React.useRef(false);
    const prevMessagesLoadingRef = React.useRef<boolean>(true);
    const layoutStabilizeTimerRef = React.useRef<number | null>(null);

    // Streaming state lives in the global runtime so both panel mounts (page + drawer)
    // share the same buffer, optimistic pending, and persisted-id flicker prevention.
    const streamState = useChatStreamingStore((s) =>
        activeConversationId ? s.byConversation[activeConversationId] : undefined,
    );
    const streamingBuffer = streamState?.buffer ?? "";
    const pending = streamState?.pending ?? null;
    const persistedAssistantId = streamState?.persistedAssistantMessageId ?? null;
    // Friendly label for the current agent stage (planning/retrieving/etc.), shown in place of the
    // generic "thinking…" while the backend works. Falls back to "thinking…" when no stage yet.
    const thinkingMeta = stageToLabel(streamState?.stage, streamState?.stageDetail);

    const { data: conversations, isLoading: convosLoading, refetch: refetchConversations } = useListConversations(
        isProject ? { projectId } : { organizationId },
    );
    const { data: messages, isLoading: messagesLoading } = useListMessages(
        activeConversationId ?? undefined,
    );
    const { mutate: createConversation, isPending: creatingConversation } = useCreateConversation();
    const { mutate: sendMessage, isPending: sending } = useSendMessage(activeConversationId ?? "");

    const newConversationPayload = React.useCallback(
        (title: string) => {
            if (isProject) {
                return { projectId: projectId!, type: ConversationType.RAG_CHAT, title };
            }
            return { organizationId: organizationId!, type: ConversationType.ORG, title };
        },
        [isProject, projectId, organizationId],
    );

    /**
     * Auto-select the first conversation, or auto-create a default one.
     *
     * Storm-proofed: the previous version included `creatingConversation` in
     * its deps. When the create-mutation failed (e.g. server returned 400 for
     * an unresolved projectId), `creatingConversation` flipped true → false,
     * which re-fired this effect, which re-fired the mutation. ~30 requests/sec.
     *
     * Now we (a) don't depend on `creatingConversation`, (b) latch a per-scope
     * "tried once" ref so a single failure stops the loop until the user does
     * something (changes scope or remounts the panel), and (c) record the
     * failure so subsequent renders short-circuit cheaply.
     */
    const autoCreateAttemptRef = React.useRef<{ scope: string; failed: boolean } | null>(null);
    React.useEffect(() => {
        if (!isProject && !organizationId) { return; }
        if (isProject && !projectId) { return; }
        if (!conversations) { return; }
        if (activeConversationId) { return; }
        if (conversations.length > 0) {
            setActiveConversationId(conversations[0].id);
            return;
        }

        const scopeKey = isProject ? `project:${projectId}` : `org:${organizationId}`;
        const prev = autoCreateAttemptRef.current;
        // Reset the latch when scope changes — switching projects/orgs is the
        // legitimate signal to retry.
        const latch = (!prev || prev.scope !== scopeKey)
            ? { scope: scopeKey, failed: false }
            : prev;
        autoCreateAttemptRef.current = latch;
        // Already attempted for this scope (success would have flipped activeConversationId
        // and short-circuited above; failure latches `failed = true`).
        if (latch.failed) { return; }
        if (creatingConversation) { return; }

        autoCreateAttemptRef.current = { scope: scopeKey, failed: true };
        createConversation(newConversationPayload(isProject ? "Project chat" : "Org chat"), {
            onSuccess: (created) => {
                autoCreateAttemptRef.current = { scope: scopeKey, failed: false };
                setActiveConversationId(created.id);
                refetchConversations();
            },
            onError: (err) => {
                // Keep the latch flipped so we don't loop. User can scroll the
                // sidebar / refresh / change scope to retry.
                toast.error("Failed to create chat", { description: (err as Error).message });
            },
        });
    }, [
        activeConversationId,
        conversations,
        creatingConversation,
        setActiveConversationId,
        // creatingConversation intentionally omitted — see ref-latch comment above.
        createConversation,
        isProject,
        projectId,
        organizationId,
        refetchConversations,
        newConversationPayload,
    ]);

    // Refcounted runtime acquire — joins the room + installs the global socket listeners
    // on first acquire across all panels, leaves the room only when the last panel unmounts
    // (and only if no job is in flight, otherwise the runtime keeps watching to surface a
    // toast when the answer arrives).
    React.useEffect(() => {
        if (!activeConversationId) { return; }
        acquireConversation(activeConversationId);
        setShowJumpToLatest(false);
        userNearBottomRef.current = true;
        didInitialScrollRef.current = false;
        return () => releaseConversation(activeConversationId);
    }, [activeConversationId]);

    // Once the persisted assistant message lands in the message list, drop the streamed
    // bubble. Doing this when the persisted row is visible avoids the
    // "stream → blank → row" flicker on the SSE/DB handoff.
    //
    // Fallback: if the messages query refetch doesn't return the new assistant message
    // within FORCE_CLEAR_MS, we force-clear anyway. Without this fallback, a single
    // missed/delayed socket `newMessage(assistant)` event, a read-replica lag, or an
    // SSE `answer` event that arrived without `chatMessageId` would leave the panel
    // permanently stuck in "streaming…" state. The 1.5 s budget is generous enough for
    // normal refetch latency but short enough that the user notices a hung state for at
    // most one beat of UI feedback.
    const FORCE_CLEAR_MS = 1500;
    React.useEffect(() => {
        if (!activeConversationId) { return; }
        if (!persistedAssistantId) { return; }

        // Happy path — persisted row is already in messages: clear synchronously.
        if (messages && messages.some((m) => m.id === persistedAssistantId)) {
            useChatStreamingStore.getState().clear(activeConversationId);
            return;
        }

        // Otherwise wait up to FORCE_CLEAR_MS for messages to catch up. The timer is reset
        // whenever messages updates (effect re-runs with new deps), so a slow-but-eventual
        // refetch with the new row still clears synchronously and skips the fallback.
        const timer = window.setTimeout(() => {
            useChatStreamingStore.getState().clear(activeConversationId);
        }, FORCE_CLEAR_MS);
        return () => window.clearTimeout(timer);
    }, [activeConversationId, persistedAssistantId, messages]);

    const isNearBottom = React.useCallback((el: HTMLElement) => {
        const thresholdPx = 80;
        const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
        return remaining <= thresholdPx;
    }, []);

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior) => {
        const el = scrollAreaRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior });
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    // Layout-stable "pin to bottom" after initial load / loading transitions.
    React.useLayoutEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) { return; }

        const hadLoading = prevMessagesLoadingRef.current;
        prevMessagesLoadingRef.current = messagesLoading;

        const messageCount = messages?.length ?? 0;
        const justFinishedLoading = hadLoading && !messagesLoading;

        if (!didInitialScrollRef.current && !messagesLoading && messageCount > 0) {
            didInitialScrollRef.current = true;
            userNearBottomRef.current = true;
            setShowJumpToLatest(false);

            // Double-rAF to let DOM paint and measure (prevents "lands short" on first load).
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    scrollToBottom("auto");
                });
            });
            return;
        }

        if (justFinishedLoading && userNearBottomRef.current) {
            window.requestAnimationFrame(() => {
                scrollToBottom("auto");
            });
        }
    }, [messagesLoading, messages, scrollToBottom]);

    // If content height grows after render (markdown, fonts, images), re-pin once when near bottom.
    React.useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) { return; }

        const ro = new ResizeObserver(() => {
            if (!userNearBottomRef.current) { return; }
            if (layoutStabilizeTimerRef.current) { window.clearTimeout(layoutStabilizeTimerRef.current); }
            layoutStabilizeTimerRef.current = window.setTimeout(() => {
                layoutStabilizeTimerRef.current = null;
                if (!userNearBottomRef.current) { return; }
                scrollToBottom("auto");
            }, 80);
        });

        ro.observe(el);
        return () => {
            ro.disconnect();
            if (layoutStabilizeTimerRef.current) {
                window.clearTimeout(layoutStabilizeTimerRef.current);
                layoutStabilizeTimerRef.current = null;
            }
        };
    }, [scrollToBottom]);

    React.useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) { return; }

        const shouldAutoScroll = userNearBottomRef.current || isNearBottom(el);
        if (shouldAutoScroll) {
            // Use "auto" for initial/just-finished-load; "smooth" for incremental updates.
            const behavior: ScrollBehavior = didInitialScrollRef.current ? "smooth" : "auto";
            messagesEndRef.current?.scrollIntoView({ behavior });
            setShowJumpToLatest(false);
        } else {
            // New content came in while the user is reading older messages.
            setShowJumpToLatest(true);
        }
    }, [messages, streamingBuffer, pending, isNearBottom]);

    const hidePendingUserBubble = !!pending?.persistedUserMessageId
        && (messages ?? []).some((m) => m.id === pending.persistedUserMessageId);

    const handleSend = () => {
        const text = messageInput.trim();
        if (!text || !activeConversationId || sending) { return; }

        // Optimistic state goes through the global runtime so both panel mounts (page +
        // drawer) reflect the same in-flight exchange.
        recordPendingExchange(activeConversationId, text);
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
                    if (!activeConversationId) { return; }
                    if (res?.userMessage?.id) {
                        recordPersistedUserMessageId(activeConversationId, res.userMessage.id);
                    }
                    if (res?.jobId) {
                        startConversationJob(activeConversationId, res.jobId);
                    }
                },
                onError: (err) => {
                    toast.error("Failed to send", { description: (err as Error).message });
                    if (activeConversationId) {
                        useChatStreamingStore.getState().clear(activeConversationId);
                    }
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

    // Stash the active conversation's title in the runtime so the "reply ready" toast can
    // reference it by name when the user has navigated away from chat.
    React.useEffect(() => {
        if (activeConversationId) {
            recordConversationTitle(activeConversationId, activeConversation?.title);
        }
    }, [activeConversationId, activeConversation?.title]);

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
        <div className={cn("flex min-h-0 flex-1", height, className)}>
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

            <div className="flex min-h-0 flex-1 flex-col min-w-0">
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
                    className={cn("custom-scrollbar relative min-h-0 flex-1 overflow-y-auto space-y-3", compact ? "p-3" : "p-4")}
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
                    {(messages?.length ?? 0) === 0 && !streamingBuffer && !messagesLoading ? (
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
                    {pending && !hidePendingUserBubble ? (
                        <UserBubble
                            text={pending.userText}
                            compact={compact}
                            meta="sending…"
                        />
                    ) : null}
                    {streamingBuffer ? (
                        <AssistantRow
                            compact={compact}
                            markdown={streamingBuffer}
                            meta="streaming…"
                            showBadge
                            enableCopy={false}
                            showHoverTime={false}
                            trailingCaret
                            steps={streamState?.steps}
                            stepsLive
                        />
                    ) : pending && !persistedAssistantId ? (
                        // Only show "thinking…" while we genuinely don't have an answer yet.
                        // Once the SSE `answer` event has fired (`persistedAssistantId` set), we
                        // know the backend has produced the response — even if `streamingBuffer`
                        // is still empty because no chunks came through and the answer string
                        // was empty (which makes `seedAnswerIfEmpty` no-op in lib/chat-runtime.ts).
                        // Without this extra gate, "thinking…" would persist under the response
                        // for the entire window between the answer event firing and the messages
                        // query refetch completing — visible to the user as a bug.
                        <AssistantRow
                            compact={compact}
                            markdown=""
                            meta={thinkingMeta}
                            showBadge
                            enableCopy={false}
                            showHoverTime={false}
                            placeholderDots={!(streamState?.steps && streamState.steps.length > 0)}
                            steps={streamState?.steps}
                            stepsLive
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
        <div className="shrink-0 px-3 py-2 flex items-start justify-between gap-3">
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

    const showHelper = !compact && !sending && !value.trim();

    return (
        <div className={cn("shrink-0", compact ? "p-2" : "p-4")}>
            <div className="relative rounded-2xl bg-card shadow-sm ring-1 ring-border/40 px-3 py-2">
                <textarea
                    ref={resolvedTextareaRef}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                    disabled={disabled}
                    rows={1}
                    /*
                     * `field-sizing: content` is the modern, native auto-grow
                     * for form controls — Chrome 123+, Safari 17.4+, Firefox
                     * 135+. The browser sizes the textarea to fit its content
                     * exactly, so `rows={1}` plus an empty value renders as
                     * one line tall (no min-height chunk, no JS layout
                     * thrash).
                     *
                     * `max-h-40` caps the growth so a runaway paste still
                     * leaves room for the messages above; once the cap is hit
                     * the textarea scrolls internally via the scroll classes.
                     *
                     * The previous JS-based `style.height = scrollHeight`
                     * approach kept fighting flex layout and reading wrong
                     * values on first paint (the "big-then-shrinks" bug).
                     */
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                    className={cn(
                        "w-full resize-none bg-transparent outline-none block",
                        "max-h-40 overflow-y-auto custom-scrollbar",
                        compact ? "text-xs" : "text-sm",
                        "pr-12 leading-6",
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
                steps={message.metadata?.steps as AgentStep[] | undefined}
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

/** The agent's step timeline. Live (streaming): an expanded list with spinner/check + finding.
 *  Done (persisted/final): collapses into a "Worked through N steps" toggle. */
function StepsTimeline({ steps, live }: { steps: AgentStep[]; live: boolean }) {
    if (!steps || steps.length === 0) { return null; }
    const Row = ({ s }: { s: AgentStep }) => (
        <div className="flex items-start gap-2 py-0.5">
            {s.status === "running" ? (
                <Loader2 className="size-3.5 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
                <Check className="size-3.5 mt-0.5 shrink-0 text-(--accent-lime)" />
            )}
            <div className="min-w-0">
                <span className="text-xs text-foreground/90">{s.label}</span>
                {s.detail ? <span className="text-[11px] text-muted-foreground"> — {s.detail}</span> : null}
            </div>
        </div>
    );
    if (live) {
        return (
            <div className="mb-2 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5">
                {steps.map((s) => <Row key={s.id} s={s} />)}
            </div>
        );
    }
    return (
        <Collapsible className="mb-2">
            <CollapsibleTrigger className="group/steps flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <ChevronRight className="size-3 transition-transform group-data-[state=open]/steps:rotate-90" />
                Worked through {steps.length} step{steps.length === 1 ? "" : "s"}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
                {steps.map((s) => <Row key={s.id} s={s} />)}
            </CollapsibleContent>
        </Collapsible>
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
    steps,
    stepsLive,
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
    steps?: AgentStep[];
    stepsLive?: boolean;
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
                            title="Ovlox"
                        >
                            O
                        </div>
                    ) : (
                        <div className="w-8" aria-hidden />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {showBadge ? (
                        <div className="flex items-baseline gap-2 mb-1">
                            <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>Ovlox</p>
                            {meta ? <p className="text-[10px] text-muted-foreground">{meta}</p> : null}
                        </div>
                    ) : null}

                    {steps && steps.length > 0 ? <StepsTimeline steps={steps} live={!!stepsLive} /> : null}

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
