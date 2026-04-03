"use client"

import Image from 'next/image'
import { useParams } from "next/navigation"
import { LayoutDashboard, Users, GitBranch, Plug } from "lucide-react"

import OvloxLogo from '@/assets/ovlox.svg'

import { Separator } from "@/components/ui/separator"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, } from "@/components/ui/sidebar"
import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { ProjectSwitcher } from "@/components/layout/project-switcher"
import { OrganizationSwitcher } from "@/components/layout/organization-switcher"
import { useAuthStore } from "@/entities/auth"
import type { IUser } from "@/types/prisma-generated"

function navUserFromSession(user: IUser | null) {
  if (!user) {
    return { name: "Account", email: "", avatar: undefined as string | undefined }
  }
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "Account"
  return {
    name,
    email: user.email ?? "",
    avatar: user.avatarUrl ?? undefined,
  }
}

export function AppSidebar() {
  const params = useParams()
  const organizationId = (params?.organizationId as string) ?? ""
  const sessionUser = useAuthStore((s) => s.auth.user)

  const baseNavItems = [
    {
      title: "Dashboard",
      url: `/${organizationId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Integrations",
      icon: Plug,
      url: `/${organizationId}/integrations`,
    },
    {
      title: "Members",
      icon: Users,
      url: `/${organizationId}/members`,
    },
    {
      title: "Organizations",
      icon: Users,
      isActive: true,
      items: [
        {
          title: "All Organizations",
          url: `/${organizationId}/organizations`,
        },
        {
          title: "New Organization",
          url: "/new-organization",
        },
      ],
    },
    {
      title: "Projects",
      icon: GitBranch,
      isActive: true,
      items: [
        {
          title: "All Projects",
          url: `/${organizationId}/projects`,
        },
        {
          title: "New Project",
          url: `/${organizationId}/projects/new-project`,
        },
      ],
    },
  ];

  const user = navUserFromSession(sessionUser)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 bg-background border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem className='flex items-center justify-center'>
            <Image
              src={OvloxLogo}
              alt="Ovlox Logo"
              height={100}
              width={100}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <OrganizationSwitcher organizationId={organizationId} />
      <SidebarContent className="overflow-hidden bg-background gap-0">
        {/* Nav Main Dashboard, Organizations, Projects */}
        <NavMain items={baseNavItems} />
        <Separator className='bg-sidebar-border' />
        {/* All Projects */}
        <ProjectSwitcher organizationId={organizationId} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border bg-background">
        {/* Sidebar Footer User Name, Email, Avatar */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
