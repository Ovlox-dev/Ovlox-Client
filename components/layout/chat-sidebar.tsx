"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
    Check,
    ChevronDown,
    ChevronsRight,
    Loader2,
    MessageSquare,
    Plus,
    X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AiChatPanel, type AiChatScope } from "@/widgets/ai-chat-panel";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    useCreateConversation,
    useListConversations,
} from "@/entities/chat";
import { ConversationType } from "@/types/enum";
import {
    CHAT_SIDEBAR_COLLAPSED_WIDTH,
    CHAT_SIDEBAR_MAX_WIDTH,
    CHAT_SIDEBAR_MIN_WIDTH,
    buildScopeKey,
    useChatSidebarStore,
} from "@/shared/lib/chat-sidebar/chat-sidebar.store";

/**
 * Right-edge chat sidebar — behaves like the left nav (push, not overlay).
 *
 * Mounted as a `flex` sibling of `<SidebarInset>` inside `<SidebarProvider>`.
 * That means the page content (`SidebarInset` is `flex-1`) shrinks as this
 * panel grows, exactly the way the left sidebar shoves content right when it
 * opens.
 *
 * Two visual states:
 *   1. **Collapsed (icon rail)** — narrow column with a single chat button.
 *      Click the button to expand. Matches the visual density of the left
 *      sidebar's icon-only mode.
 *   2. **Expanded** — full panel hosting `<AiChatPanel>`. Width is a stored
 *      value in [MIN..MAX] px, draggable via the left-edge handle.
 *
 * Width persistence: `useChatSidebarStore` keeps `open` and `width` in
 * `localStorage` so the user's preferred geometry survives reloads.
 *
 * Resize implementation: `mousedown` on the handle starts a resize session,
 * the handler attaches `mousemove` + `mouseup` listeners on `document` so the
 * drag isn't bound to the handle's hitbox (the cursor outpaces the element if
 * we listen on the handle directly). `body.cursor` and `body.userSelect` are
 * pinned during the drag so text selection across the page doesn't fire.
 */
export function ChatSidebar() {
    const open = useChatSidebarStore((s) => s.open);
    const width = useChatSidebarStore((s) => s.width);
    const isResizing = useChatSidebarStore((s) => s.isResizing);
    const setOpen = useChatSidebarStore((s) => s.setOpen);
    const setWidth = useChatSidebarStore((s) => s.setWidth);
    const setResizing = useChatSidebarStore((s) => s.setResizing);

    // Scope-detection — same logic the old AiChatDrawer used. A project route
    // gets a project-scoped chat; otherwise it falls back to the org scope.
    const params = useParams<{ organizationId?: string; projectId?: string }>();
    const organizationId = params?.organizationId ?? "";
    const projectId = params?.projectId ?? "";
    const scope: AiChatScope | null = projectId
        ? { kind: "project", projectId, organizationId: organizationId || undefined }
        : organizationId
            ? { kind: "org", organizationId }
            : null;

    /** Pre-resize anchor — captured on mousedown so we can compute the new
     *  width as `startWidth + (startX - currentX)` (right-side panel: cursor
     *  moving LEFT = wider; moving RIGHT = narrower). Using deltas instead of
     *  absolute mouse positions keeps the drag stable across high-DPI screens
     *  with non-integer cursor positions. */
    const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

    const startResize = React.useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            // Only respond to the primary button and ignore right/middle-clicks.
            if (event.button !== 0) return;
            event.preventDefault();
            dragRef.current = { startX: event.clientX, startWidth: width };
            setResizing(true);

            const onMove = (ev: MouseEvent) => {
                const drag = dragRef.current;
                if (!drag) return;
                const next = drag.startWidth + (drag.startX - ev.clientX);
                setWidth(next);
            };
            const onUp = () => {
                dragRef.current = null;
                setResizing(false);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };

            document.body.style.cursor = "ew-resize";
            // Without disabling text selection during the drag, the cursor
            // turns into a text caret and the user accidentally selects spans
            // of page content as they move the mouse.
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        },
        [width, setWidth, setResizing],
    );

    // Snap-to-default on double-click — quality-of-life shortcut common on
    // resizable IDE panels. Resets to the persisted default in case the user
    // ends up at an awkward width.
    const handleDoubleClick = React.useCallback(() => {
        setWidth(420);
    }, [setWidth]);

    // Keyboard accessibility — left/right arrows nudge by 16px, shift = 64px.
    // Lets keyboard users adjust the panel without a mouse drag.
    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const step = event.shiftKey ? 64 : 16;
            const direction = event.key === "ArrowLeft" ? 1 : -1;
            setWidth(width + step * direction);
        },
        [width, setWidth],
    );

    const renderedWidth = open ? width : CHAT_SIDEBAR_COLLAPSED_WIDTH;

    return (
        <aside
            data-state={open ? "expanded" : "collapsed"}
            aria-label="AI chat sidebar"
            className={cn(
                "relative shrink-0 border-l border-(--line-2) bg-(--bg-2)",
                // Disable the width transition while actively dragging so the
                // panel tracks the cursor 1:1 instead of lerping behind it.
                !isResizing && "transition-[width] duration-200 ease-out",
                // `h-full` so the sidebar fills the wrapper that's now locked
                // to viewport height in app-shell. The internal flex column
                // handles its own scrolling for chat messages — the page
                // scroll happens elsewhere and doesn't move this panel.
                "h-full flex flex-col",
            )}
            style={{ width: renderedWidth }}
        >
            {open ? (
                <>
                    {/* Drag handle — sits on the LEFT edge of the panel, so
                        the user can grab the visual seam between the page
                        content and the chat. Tooltip-equivalent via the
                        `title` attribute; arrow-key support for a11y. */}
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize chat sidebar"
                        aria-valuemin={CHAT_SIDEBAR_MIN_WIDTH}
                        aria-valuemax={CHAT_SIDEBAR_MAX_WIDTH}
                        aria-valuenow={width}
                        tabIndex={0}
                        title="Drag to resize · double-click to reset · ←/→ arrow keys to nudge"
                        onPointerDown={startResize}
                        onDoubleClick={handleDoubleClick}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 z-20 cursor-ew-resize",
                            "before:absolute before:inset-y-0 before:-left-1 before:w-3 before:content-['']",
                            "hover:bg-(--accent-lime)/30 active:bg-(--accent-lime)/50",
                            isResizing && "bg-(--accent-lime)/50",
                            "transition-colors",
                            "focus-visible:outline-none focus-visible:bg-(--accent-lime)/40",
                        )}
                    />

                    <header className="h-14 shrink-0 flex items-center gap-2 border-b border-(--line-2) px-3">
                        <ConversationSwitcher scope={scope} />
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Collapse chat sidebar"
                            className={cn(
                                "size-7 rounded-md flex items-center justify-center shrink-0",
                                "text-(--fg-2) hover:text-(--fg) hover:bg-(--bg-3)",
                                "transition-colors",
                            )}
                        >
                            <X className="size-4" />
                        </button>
                    </header>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        {scope ? (
                            <AiChatPanel
                                scope={scope}
                                compact
                                showConversationList={false}
                                height="h-full"
                                className="rounded-none border-0 bg-transparent"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-(--fg-3)">
                                Open an organization or project to start a chat.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Collapsed icon rail — single chat button, mirrors the left
                   nav's icon-only mode visually so the right edge feels like
                   a peer of the left edge instead of a one-off control. */
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open AI chat sidebar"
                    title="Open AI chat"
                    className={cn(
                        "h-14 shrink-0 flex items-center justify-center",
                        "text-(--fg-2) hover:text-(--accent-lime) hover:bg-(--bg-3)",
                        "border-b border-(--line-2) transition-colors",
                    )}
                >
                    <ChevronsRight className="size-4 rotate-180" aria-hidden />
                    <span className="sr-only">Expand chat sidebar</span>
                </button>
            )}
        </aside>
    );
}

/**
 * Top-of-sidebar dropdown to switch the active conversation or create a new
 * one. Replaces the static title we used to show.
 *
 * State coordination: writes the selected conversation id to
 * `useChatSidebarStore.activeConversationByScope[scopeKey]`. `<AiChatPanel>`
 * reads from the same store, so picking from this dropdown re-renders the
 * panel against the new conversation's messages without prop-drilling.
 *
 * "New conversation" creates a fresh row server-side, then sets it active —
 * the panel's auto-create useEffect notices an active id is already set and
 * doesn't double-create.
 */
function ConversationSwitcher({ scope }: { scope: AiChatScope | null }) {
    const scopeKey = scope ? buildScopeKey(scope) : null;
    const activeId = useChatSidebarStore((s) =>
        scopeKey ? s.activeConversationByScope[scopeKey] ?? null : null,
    );
    const setActive = useChatSidebarStore((s) => s.setActiveConversation);

    const isProject = scope?.kind === "project";
    const projectId = isProject && scope ? scope.projectId : undefined;
    const organizationId = !isProject && scope ? scope.organizationId : undefined;
    // Org context for a project chat — disambiguates the per-org-unique project slug on the backend.
    const projectOrgScope = isProject && scope ? scope.organizationId : undefined;

    const { data: conversations, isLoading, refetch } = useListConversations(
        isProject ? { projectId, orgScope: projectOrgScope } : { organizationId },
    );
    const { mutate: createConversation, isPending: creating } = useCreateConversation();

    const activeConversation = conversations?.find((c) => c.id === activeId) ?? null;
    const triggerLabel =
        activeConversation?.title?.trim() ||
        (isLoading ? "Loading…" : conversations && conversations.length > 0 ? "Select a chat" : "New chat");

    const handleSelect = (id: string) => {
        if (!scopeKey) return;
        setActive(scopeKey, id);
    };

    const handleNew = () => {
        if (!scope || !scopeKey) return;
        const payload =
            scope.kind === "project"
                ? { projectId: scope.projectId, type: ConversationType.RAG_CHAT, title: "New chat", orgScope: scope.organizationId }
                : { organizationId: scope.organizationId, type: ConversationType.ORG, title: "New chat" };
        createConversation(payload, {
            onSuccess: (created) => {
                setActive(scopeKey, created.id);
                refetch();
            },
            onError: (err) => {
                toast.error("Couldn't create a new chat", {
                    description: (err as Error).message,
                });
            },
        });
    };

    if (!scope) {
        return (
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="size-4 text-(--accent-lime) shrink-0" />
                <span className="text-sm text-(--fg-3) truncate">No active scope</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={cn(
                        "flex items-center gap-2 min-w-0 flex-1 h-9 px-2.5 rounded-md",
                        "text-left text-sm",
                        "hover:bg-(--bg-3) transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)/40",
                    )}
                >
                    <MessageSquare className="size-4 text-(--accent-lime) shrink-0" />
                    <span className="font-medium text-(--fg) truncate flex-1">{triggerLabel}</span>
                    <ChevronDown className="size-3.5 text-(--fg-3) shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-72 max-h-96 overflow-y-auto bg-(--bg-2) border-(--line)"
                >
                    <DropdownMenuItem
                        onSelect={(e) => {
                            // Prevent default close-on-select so the user sees the
                            // pending state if creation is slow.
                            if (creating) e.preventDefault();
                            handleNew();
                        }}
                        className="gap-2 cursor-pointer focus:bg-(--bg-3) text-(--accent-lime)"
                    >
                        {creating ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        <span className="font-medium">
                            {creating ? "Creating…" : "New conversation"}
                        </span>
                    </DropdownMenuItem>

                    {conversations && conversations.length > 0 ? (
                        <>
                            <DropdownMenuSeparator className="bg-(--line-2)" />
                            {conversations.map((c) => {
                                const isCurrent = c.id === activeId;
                                const title = c.title?.trim() || "Untitled chat";
                                const lastMessage = c.messages?.[0]?.content?.trim();
                                return (
                                    <DropdownMenuItem
                                        key={c.id}
                                        onSelect={() => handleSelect(c.id)}
                                        className={cn(
                                            "gap-2 cursor-pointer focus:bg-(--bg-3) items-start py-2",
                                            isCurrent && "bg-(--bg-3)/60",
                                        )}
                                    >
                                        <div className="size-4 shrink-0 mt-0.5 flex items-center justify-center">
                                            {isCurrent ? (
                                                <Check className="size-3.5 text-(--accent-lime)" />
                                            ) : null}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-(--fg) truncate">{title}</p>
                                            {lastMessage ? (
                                                <p className="text-xs text-(--fg-3) truncate mt-0.5">
                                                    {lastMessage}
                                                </p>
                                            ) : null}
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </>
                    ) : isLoading ? (
                        <div className="px-2 py-3 flex items-center gap-2 text-xs text-(--fg-3)">
                            <Loader2 className="size-3.5 animate-spin" />
                            Loading conversations…
                        </div>
                    ) : (
                        <div className="px-2 py-3 text-xs text-(--fg-3)">
                            No previous chats yet — start one above.
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
