"use client";

import * as React from "react";
import { Send, Plus, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

function formatTime(d: Date): string {
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) { return "just now"; }
    if (diffMin < 60) { return `${diffMin}m ago`; }
    if (diffMin < 1440) { return `${Math.floor(diffMin / 60)}h ago`; }
    return d.toLocaleDateString();
}

function getInitials(name?: string | null): string {
    if (!name) { return "AI"; }
    return name.split(" ").filter(Boolean).map((p) => p[0]?.toUpperCase()).slice(0, 2).join("") || "AI";
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
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const { data: conversations, isLoading: convosLoading, refetch: refetchConversations } = useListConversations(
        isProject ? { projectId } : { organizationId },
    );
    const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useListMessages(
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
        return () => releaseChatSocket();
    }, []);

    React.useEffect(() => {
        if (!activeConversationId) { return; }
        joinConversation(activeConversationId);
        // Switching conversations should drop any leftover optimistic state from the previous one.
        setPending(null);
        setStreaming({ buffer: "", jobId: null });

        const offChunk = onChatChunk((evt) => {
            if (evt.conversationId !== activeConversationId) { return; }
            setStreaming((prev) => ({ buffer: prev.buffer + evt.delta, jobId: evt.jobId ?? prev.jobId }));
        });
        const offNew = onNewMessage((evt) => {
            if (evt.conversationId !== activeConversationId) { return; }
            refetchMessages();
            setStreaming({ buffer: "", jobId: null });
            // Server has the canonical user + assistant rows now — clear the optimistic placeholder.
            setPending(null);
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
            }
        });

        return () => {
            leaveConversation(activeConversationId);
            offChunk?.();
            offNew?.();
            offProcessing?.();
        };
    }, [activeConversationId, refetchMessages]);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streaming.buffer, pending]);

    const handleSend = () => {
        const text = messageInput.trim();
        if (!text || !activeConversationId || sending) { return; }
        setStreaming({ buffer: "", jobId: null });
        setPending({ userText: text, sentAt: Date.now() });
        setMessageInput("");
        sendMessage(
            { question: text },
            {
                onSuccess: () => {
                    refetchMessages();
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

    const conversationList = conversations ?? [];

    return (
        <div className={cn("flex bg-background border border-border rounded-lg overflow-hidden", height, className)}>
            {showConversationList ? (
                <div className={cn("hidden md:flex border-r border-border flex-col", compact ? "w-44" : "w-64")}>
                    <div className="p-3 border-b border-border flex items-center justify-between">
                        <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Conversations</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={handleNewConversation}
                            disabled={creatingConversation}
                            title="New conversation"
                        >
                            <Plus className="size-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {convosLoading ? (
                            <div className="p-3 text-xs text-muted-foreground">Loading…</div>
                        ) : conversationList.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground">No conversations yet.</div>
                        ) : (
                            conversationList.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveConversationId(c.id)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2",
                                        c.id === activeConversationId
                                            ? "bg-accent-contrast text-text"
                                            : "hover:bg-muted text-muted-foreground",
                                    )}
                                >
                                    <MessageSquare className="size-3.5 shrink-0" />
                                    <span className="truncate">{c.title || "Untitled"}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : null}

            <div className="flex-1 flex flex-col min-w-0">
                {!compact ? (
                    <div className="border-b border-border p-3">
                        <h2 className="font-semibold text-sm flex items-center gap-2">
                            <MessageSquare className="size-4" />
                            {isProject ? "Project AI Chat" : "Org AI Chat"}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isProject
                                ? "Ask questions about your project. Answers reference your integrated data."
                                : "Ask questions across your organization."}
                        </p>
                    </div>
                ) : null}

                <div className={cn("flex-1 overflow-y-auto space-y-3", compact ? "p-3" : "p-4")}>
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
                        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground p-6">
                            <div>
                                <MessageSquare className="size-7 mx-auto mb-2 opacity-50" />
                                <p>{isProject ? "No messages yet. Ask anything about this project." : "Ask anything about this org."}</p>
                            </div>
                        </div>
                    ) : (
                        (messages ?? []).map((m) => (
                            <MessageRow key={m.id} message={m} currentUserId={sessionUser?.id} compact={compact} />
                        ))
                    )}
                    {pending ? (
                        <div className="flex gap-2.5">
                            <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                                <AvatarFallback className={cn(compact ? "text-[10px]" : "text-xs", "bg-primary text-primary-foreground")}>
                                    {getInitials(
                                        sessionUser
                                            ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || sessionUser.email
                                            : "You",
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                    <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>You</p>
                                    <p className="text-[10px] text-muted-foreground">sending…</p>
                                </div>
                                <p className={cn("text-foreground whitespace-pre-wrap wrap-break-word", compact ? "text-xs" : "text-sm")}>
                                    {pending.userText}
                                </p>
                            </div>
                        </div>
                    ) : null}
                    {streaming.buffer ? (
                        <div className="flex gap-2.5">
                            <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                                <AvatarFallback className={cn(compact ? "text-[10px]" : "text-xs", "bg-accent text-accent-contrast")}>
                                    AI
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                    <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>Assistant</p>
                                    <p className="text-[10px] text-muted-foreground">streaming…</p>
                                </div>
                                <p className={cn("text-foreground whitespace-pre-wrap wrap-break-word", compact ? "text-xs" : "text-sm")}>
                                    {streaming.buffer}
                                    <span className="inline-block w-1 h-4 bg-foreground/60 align-middle ml-0.5 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    ) : pending ? (
                        <div className="flex gap-2.5">
                            <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                                <AvatarFallback className={cn(compact ? "text-[10px]" : "text-xs", "bg-accent text-accent-contrast")}>
                                    AI
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                    <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>Assistant</p>
                                    <p className="text-[10px] text-muted-foreground">thinking…</p>
                                </div>
                                <div className="flex items-center gap-1 py-2">
                                    <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="size-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                </div>

                <div className={cn("border-t border-border", compact ? "p-2" : "p-4")}>
                    <div className="flex gap-2 items-end">
                        <Input
                            placeholder={activeConversationId ? "Ask a question…" : "Loading…"}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={!activeConversationId || sending}
                            className="text-sm"
                        />
                        <Button
                            size="sm"
                            onClick={handleSend}
                            disabled={!messageInput.trim() || !activeConversationId || sending}
                            className="shrink-0"
                        >
                            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageRow({
    message,
    currentUserId,
    compact,
}: {
    message: ChatMessageWithDetails;
    currentUserId?: string;
    compact?: boolean;
}) {
    const isAssistant = message.role === ChatRole.ASSISTANT;
    const isOwn = !isAssistant && message.sender?.id === currentUserId;
    const senderName = isAssistant
        ? "Assistant"
        : [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(" ") || "You";
    const ts = message.createdAt ? new Date(message.createdAt) : new Date();

    return (
        <div className="flex gap-2.5 group">
            <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                <AvatarFallback
                    className={cn(
                        compact ? "text-[10px]" : "text-xs",
                        isAssistant ? "bg-accent text-accent-contrast" : isOwn ? "bg-primary text-primary-foreground" : "",
                    )}
                >
                    {isAssistant ? "AI" : getInitials(senderName)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                    <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{senderName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTime(ts)}</p>
                </div>
                <p className={cn("text-foreground whitespace-pre-wrap wrap-break-word", compact ? "text-xs" : "text-sm")}>
                    {message.content}
                </p>
                {(message.sources?.length ?? 0) > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {message.sources!.slice(0, 5).map((src) => (
                            <span
                                key={src.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                                title={src.rawEvent?.title ?? src.llmOutput?.type ?? "source"}
                            >
                                {src.rawEvent?.provider ?? src.rawEvent?.type ?? src.llmOutput?.type ?? "source"}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
