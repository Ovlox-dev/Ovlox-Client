"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Width bounds for the resizable chat sidebar (in px).
 *
 *  - `MIN`  keeps the panel usable for short replies — narrower than this and
 *           message bubbles wrap awkwardly.
 *  - `MAX`  caps the drag so a user can't accidentally drag the page content
 *           down to almost zero. 720px is roughly half of a 1440-wide laptop.
 *  - `DEFAULT` matches the previous Drawer-based AiChatDrawer width (420px),
 *           so existing users see no visual jump when this ships.
 */
export const CHAT_SIDEBAR_MIN_WIDTH = 280;
export const CHAT_SIDEBAR_MAX_WIDTH = 720;
export const CHAT_SIDEBAR_DEFAULT_WIDTH = 420;

/**
 * When the sidebar is collapsed it shrinks to a narrow icon rail (matching
 * the visual density of the left nav's icon-only mode), wide enough for a
 * single 28px button + breathing room.
 */
export const CHAT_SIDEBAR_COLLAPSED_WIDTH = 56;

/**
 * Build a stable key for a chat scope. The active-conversation map is keyed
 * by this string so a user's last-active project chat survives navigation
 * away and back to that project.
 */
export type ChatScopeKey = string;
export function buildScopeKey(scope:
    | { kind: "project"; projectId: string }
    | { kind: "org"; organizationId: string }
    | null
    | undefined): ChatScopeKey | null {
    if (!scope) return null;
    if (scope.kind === "project") return scope.projectId ? `project:${scope.projectId}` : null;
    return scope.organizationId ? `org:${scope.organizationId}` : null;
}

interface ChatSidebarState {
    /** Whether the sidebar is expanded. When false it renders as the icon rail. */
    open: boolean;
    /** Persisted expanded-mode width in px. Ignored while `open === false`. */
    width: number;
    /** True while the user is actively dragging the resize handle. Disables the
     *  CSS width transition so the panel tracks the cursor 1:1. */
    isResizing: boolean;
    /**
     * Last-selected conversation per scope. Lifted out of `<AiChatPanel>` so
     * the ChatSidebar header (a sibling of the panel) can drive selection
     * via its dropdown without prop-drilling. Persisted so reopening the
     * panel resumes the user's previous conversation instead of auto-creating
     * a new one each time.
     */
    activeConversationByScope: Record<ChatScopeKey, string | null>;
    setOpen: (next: boolean) => void;
    toggle: () => void;
    setWidth: (next: number) => void;
    setResizing: (next: boolean) => void;
    setActiveConversation: (scopeKey: ChatScopeKey, conversationId: string | null) => void;
    /** Reset all sidebar state to defaults. Used on logout so the previous user's
     *  active-conversation map / open state doesn't leak into the next session. */
    reset: () => void;
}

function clampWidth(n: number): number {
    if (!Number.isFinite(n)) return CHAT_SIDEBAR_DEFAULT_WIDTH;
    return Math.min(CHAT_SIDEBAR_MAX_WIDTH, Math.max(CHAT_SIDEBAR_MIN_WIDTH, Math.round(n)));
}

export const useChatSidebarStore = create<ChatSidebarState>()(
    persist(
        (set) => ({
            open: false,
            width: CHAT_SIDEBAR_DEFAULT_WIDTH,
            isResizing: false,
            activeConversationByScope: {},
            setOpen: (next) => set({ open: next }),
            toggle: () => set((s) => ({ open: !s.open })),
            setWidth: (next) => set({ width: clampWidth(next) }),
            setResizing: (next) => set({ isResizing: next }),
            setActiveConversation: (scopeKey, conversationId) =>
                set((s) => ({
                    activeConversationByScope: {
                        ...s.activeConversationByScope,
                        [scopeKey]: conversationId,
                    },
                })),
            reset: () =>
                set({
                    open: false,
                    width: CHAT_SIDEBAR_DEFAULT_WIDTH,
                    isResizing: false,
                    activeConversationByScope: {},
                }),
        }),
        {
            name: "chat-sidebar",
            storage: createJSONStorage(() => localStorage),
            // Persist the durable bits. `isResizing` is transient drag state
            // and shouldn't survive a reload.
            partialize: (state) => ({
                open: state.open,
                width: state.width,
                activeConversationByScope: state.activeConversationByScope,
            }),
        },
    ),
);
