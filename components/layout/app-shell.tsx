"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider, SidebarTrigger, } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { DashboardBreadcrumb } from "../dashboard-breadcrumb"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { MessageSquare } from "lucide-react"
import { AiChatPanel, type AiChatScope } from "@/widgets/ai-chat-panel"
import { useOrgStore } from "@/shared/lib/organization/org-store"
import { userOrgById } from "@/entities/organization/api/org"
import { setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver"
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
    <SidebarProvider defaultOpen={true}>
      <OrgRouteSync />
      <ChatRuntimeBridge />
      <AppSidebar />
      <SidebarInset>
        <header
          className={cn(
            "flex h-16 items-center gap-2 border-b border-border bg-background px-4",
            "sticky top-0 z-10"
          )}
        >
          <SidebarTrigger aria-label="Toggle sidebar left" />
          <div className="flex items-center justify-between flex-1">
            <DashboardBreadcrumb />
            <div className="flex items-center gap-2">
              <AiChatDrawer />

              <ModeToggle />
            </div>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 overflow-auto p-4 md:p-6",
            "max-w-(--content-max-width,100rem) w-full mx-auto",
            className
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
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
  const urlOrgId = params?.organizationId;
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);

  React.useEffect(() => {
    if (!urlOrgId) return;
    if (currentOrg?.id === urlOrgId) return;

    let cancelled = false;
    userOrgById(urlOrgId)
      .then(({ organization }) => {
        if (cancelled) return;
        setCurrentOrg(organization);
        setActiveOrgId(organization.id);
      })
      .catch(() => {
        // Org not accessible (membership revoked, deleted, wrong URL). Clear the
        // stale store so downstream components don't keep firing with the bad id.
        if (cancelled) return;
        setCurrentOrg(null);
      });

    return () => { cancelled = true; };
  }, [urlOrgId, currentOrg?.id, setCurrentOrg]);

  return null;
}

/**
 * Renders the right-side AI chat drawer. Scope is derived from the current route:
 * if the user is viewing a project sub-route (`/[orgId]/projects/[projectId]/...`),
 * the chat is bound to that project; otherwise it's bound to the org.
 */
function AiChatDrawer() {
  const params = useParams<{ organizationId?: string; projectId?: string }>();
  const organizationId = params?.organizationId ?? "";
  const projectId = params?.projectId ?? "";

  const scope: AiChatScope | null = projectId
    ? { kind: "project", projectId }
    : organizationId
      ? { kind: "org", organizationId }
      : null;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Open AI chat"
          className="bg-accent-contrast border border-border p-1.5 rounded-md text-muted hover:bg-muted transition-colors"
        >
          <MessageSquare className="size-4 text-muted" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="w-full! sm:w-105! sm:max-w-105!">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-4" />
            {scope?.kind === "project" ? "Project AI Chat" : "Org AI Chat"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden p-3">
          {scope ? (
            <AiChatPanel
              scope={scope}
              compact
              showConversationList={false}
              height="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground p-6">
              Open an organization or project to start a chat.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
