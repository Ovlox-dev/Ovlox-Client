"use client"

import * as React from "react"
import { usePathname, useRouter, useParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider, SidebarTrigger, } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ChatSidebar } from "@/components/layout/chat-sidebar"
import { DashboardBreadcrumb } from "../dashboard-breadcrumb"
import { MessageSquare } from "lucide-react"
import { useOrgStore } from "@/shared/lib/organization/org-store"
import { userOrgById, userOrgBySlug } from "@/entities/organization/api/org"
import { setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
import { useChatSidebarStore } from "@/shared/lib/chat-sidebar/chat-sidebar.store"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
import { ChatRuntimeBridge } from "@/components/layout/chat-runtime-bridge"

export interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export function AppShell({
  children,
  className,
}: AppShellProps) {
  return (
    /*
      Layout overflow guard — the page-level horizontal scrollbar was coming
      from `SidebarInset` being a `flex-1 w-full` child without `min-w-0`.
      In flex layouts children default to `min-width: auto` (= content width),
      so when our project pages contained wide cards / charts, the inset grew
      to fit them and pushed past `100vw - sidebar`.

      Both fixes are needed:
      - `overflow-x-hidden` on the SidebarProvider wrapper clips the page
        regardless of what any child does (defensive backstop).
      - `min-w-0` on SidebarInset lets it shrink with the available space,
        so children re-flow instead of overflowing.
    */
    /*
      Why `h-svh overflow-hidden` on the SidebarProvider wrapper:
      shadcn defaults to `min-h-svh` which lets the wrapper GROW with content.
      That makes the BODY the scroll container, so when the user scrolls a
      tall page, every flex sibling (including the chat sidebar) scrolls
      with it.

      Locking the wrapper at exactly viewport height moves the scroll
      container down to the inner page <div> (which has `overflow-y-auto`
      and `min-h-0` below). Now the page content scrolls inside its column
      and the chat sidebar stays put.
    */
    <SidebarProvider defaultOpen={true} className="h-svh overflow-hidden">
      <OrgRouteSync />
      <ChatRuntimeBridge />
      <AppSidebar />
      <SidebarInset className="bg-[var(--bg)] min-w-0">
        <header
          className={cn(
            "flex h-16 items-center gap-3 border-b border-[var(--line-2)] bg-[var(--bg)] px-4",
            "shrink-0"
          )}
        >
          <SidebarTrigger
            aria-label="Toggle sidebar"
            className="text-[var(--fg-2)] hover:text-[var(--fg)] hover:bg-[var(--bg-3)]"
          />
          <div className="flex items-center justify-between flex-1 min-w-0">
            <DashboardBreadcrumb />
            <div className="flex items-center gap-2">
              <ChatSidebarTrigger />
            </div>
          </div>
        </header>
        {/*
          `min-h-0` is the critical bit — without it, a flex-1 child in a
          flex-col parent inherits `min-height: auto` (= content height), so
          `overflow-y-auto` never actually clips. With it, the div takes the
          remaining column space and scrolls internally.
        */}
        <div
          className={cn(
            "flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto p-4 md:p-6",
            "max-w-(--content-max-width,100rem) w-full mx-auto",
            className
          )}
        >
          {children}
        </div>
      </SidebarInset>
      {/*
        Right-edge chat sidebar — flex sibling of `SidebarInset`, so it shares
        the row with the page content. When it expands, `SidebarInset` shrinks
        (it's `flex-1 min-w-0`); when it collapses, the page reclaims the
        width. No overlay, no modal, no popover.
      */}
      <ChatSidebar />
    </SidebarProvider>
  )
}

/**
 * Header trigger that toggles the chat sidebar's expanded/collapsed state.
 * Mirrors the visual style of the left-side `<SidebarTrigger>` so the two
 * controls feel like a pair.
 */
function ChatSidebarTrigger() {
  const open = useChatSidebarStore((s) => s.open);
  const toggle = useChatSidebarStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Collapse AI chat" : "Open AI chat"}
      aria-pressed={open}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md",
        "border border-[var(--line)] bg-[var(--bg-2)] text-[var(--fg-2)]",
        "text-xs font-medium",
        "transition-all duration-200",
        "hover:border-[var(--accent-lime)] hover:text-[var(--accent-lime)] hover:bg-[var(--bg-3)]",
        open && "border-[var(--accent-lime)] text-[var(--accent-lime)] bg-[var(--bg-3)]",
      )}
    >
      <MessageSquare className="size-3.5" />
      <span className="hidden sm:inline">AI Chat</span>
    </button>
  )
}

/**
 * Reconciles the persisted org store against the URL `:organizationId` param. The store is
 * `localStorage`-persisted, so navigating directly to a different org's URL (or returning to
 * the app on a different org) leaves the store pointing at the OLD org. Components that read
 * `useOrg().currentOrg.id` then fire backend calls with that stale org → 403/404 spam.
 *
 * This guard:
 * - Reads `:organizationId` from the URL on every render
 * - If it differs from `currentOrg.id`, fetches the right org and updates the store
 * - Mounted once at AppShell so every page inside `/[organizationId]/*` is covered
 */
function OrgRouteSync() {
  const params = useParams<{ organizationId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const urlOrgIdentifier = params?.organizationId;
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);

  /**
   * Swap the URL bar's first path segment for the org's slug. Called after we
   * know the canonical slug — flips legacy `/UUID/...` URLs to `/slug/...` so
   * the address bar stays clean.
   */
  const replaceOrgInPath = React.useCallback(
    (currentIdentifier: string, slug: string) => {
      if (!pathname || !pathname.startsWith(`/${currentIdentifier}`)) { return; }
      const tail = pathname.slice(`/${currentIdentifier}`.length);
      router.replace(`/${slug}${tail}`);
    },
    [pathname, router],
  );

  React.useEffect(() => {
    if (!urlOrgIdentifier) { return; }

    const isUuid = UUID_REGEX.test(urlOrgIdentifier);

    // URL identifier matches the store: redirect UUID URLs to slug URLs once
    // we know the slug, but otherwise no work to do.
    if (currentOrg?.slug === urlOrgIdentifier) { return; }
    if (currentOrg?.id === urlOrgIdentifier) {
      if (isUuid && currentOrg.slug) {
        replaceOrgInPath(urlOrgIdentifier, currentOrg.slug);
      }
      return;
    }

    let cancelled = false;
    const fetcher = isUuid
      ? userOrgById(urlOrgIdentifier)
      : userOrgBySlug(urlOrgIdentifier);

    fetcher
      .then(({ organization }) => {
        if (cancelled) { return; }
        setCurrentOrg(organization);
        setActiveOrgId(organization.slug || organization.id);
        if (isUuid && organization.slug) {
          replaceOrgInPath(urlOrgIdentifier, organization.slug);
        }
      })
      .catch(() => {
        if (cancelled) { return; }  
        setCurrentOrg(null);
      });

    return () => { cancelled = true; };
  }, [urlOrgIdentifier, currentOrg?.id, currentOrg?.slug, setCurrentOrg, replaceOrgInPath]);

  return null;
}

