"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider, SidebarTrigger, } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { DashboardBreadcrumb } from "../dashboard-breadcrumb"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { PanelLeftIcon } from "lucide-react"

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
              <Drawer direction="right">
                <DrawerTrigger>
                  <div className="bg-accent-contrast border border-border p-1.5 rounded-md text-muted">
                    <PanelLeftIcon className="text-muted" />
                  </div>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Ai Chat Sidebar</DrawerTitle>
                  </DrawerHeader>
                  <DrawerFooter className="border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DrawerClose>
                          <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                        <Button variant="outline">Save</Button>
                      </div>
                    </div>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
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
