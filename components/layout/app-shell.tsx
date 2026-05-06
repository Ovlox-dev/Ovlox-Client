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
