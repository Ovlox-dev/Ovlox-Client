"use client"

import Image from 'next/image'
import { useParams } from "next/navigation"
import { LayoutDashboard, Users, GitBranch, Plug, Settings } from "lucide-react"

import OvloxLogo from '@/assets/ovlox.svg'
import OvloxSquare from '@/assets/ovlox_square.png'

import { Separator } from "@/components/ui/separator"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { ProjectSwitcher } from "@/widgets/projects/ui/project-switcher"
import { OrganizationSwitcher } from "@/components/layout/organization-switcher"
import { useAuthStore } from "@/entities/auth"
import type { IUser } from "@/types/prisma-generated"
import { usePermission } from "@/hooks/usePermission"
import { PermissionName } from "@/shared/lib/auth/permissions"

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
  const { can, isLoading: isPermissionLoading } = usePermission(organizationId || null)
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"

  type NavSubItem = { title: string; url?: string; requiredPermission?: PermissionName }
  type NavItem = {
    title: string
    url?: string
    icon?: typeof LayoutDashboard
    isActive?: boolean
    requiredPermission?: PermissionName
    items?: NavSubItem[]
  }

  const allNavItems: NavItem[] = [
    {
      title: "Dashboard",
      url: `/${organizationId}/dashboard`,
      icon: LayoutDashboard,
      requiredPermission: PermissionName.VIEW_PROJECTS,
    },
    {
      title: "Integrations",
      icon: Plug,
      url: `/${organizationId}/integrations`,
      isActive: true,
      requiredPermission: PermissionName.MANAGE_INTEGRATIONS,
      items: [
        { title: "All", url: `/${organizationId}/integrations` },
        { title: "GitHub", url: `/${organizationId}/integrations/github` },
        { title: "Slack", url: `/${organizationId}/integrations/slack` },
        { title: "Jira", url: `/${organizationId}/integrations/jira` },
        { title: "Linear", url: `/${organizationId}/integrations/linear` },
        { title: "Discord", url: `/${organizationId}/integrations/discord` },
      ],
    },
    {
      title: "Members",
      icon: Users,
      url: `/${organizationId}/members`,
      requiredPermission: PermissionName.INVITE_MEMBERS,
    },
    {
      title: "Settings",
      icon: Settings,
      url: `/${organizationId}/settings`,
      requiredPermission: PermissionName.MANAGE_ORG,
    },
    {
      title: "Organizations",
      icon: Users,
      isActive: true,
      items: [
        { title: "All Organizations", url: `/${organizationId}/organizations` },
        { title: "New Organization", url: "/new-organization" },
      ],
    },
    {
      title: "Projects",
      icon: GitBranch,
      isActive: true,
      items: [
        { title: "All Projects", url: `/${organizationId}/projects`, requiredPermission: PermissionName.VIEW_PROJECTS },
        { title: "New Project", url: `/${organizationId}/projects/new-project`, requiredPermission: PermissionName.CREATE_PROJECTS },
      ],
    },
  ];

  /**
   * Permission-gate before rendering. While the membership query is in-flight we keep all items visible
   * (avoids a flash of empty nav) — the backend still 403s if a viewer clicks something they shouldn't see.
   */
  const baseNavItems = isPermissionLoading || !organizationId
    ? allNavItems.map(({ requiredPermission: _omit, ...rest }) => rest)
    : allNavItems
        .filter((item) => !item.requiredPermission || can(item.requiredPermission))
        .map((item) => {
          const { requiredPermission: _omit, items, ...rest } = item;
          if (!items) { return rest; }
          const allowedSubItems = items.filter((sub) => !sub.requiredPermission || can(sub.requiredPermission));
          if (allowedSubItems.length === 0) { return null; }
          return {
            ...rest,
            items: allowedSubItems.map(({ requiredPermission: _o, ...subRest }) => subRest),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

  const user = navUserFromSession(sessionUser)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 bg-(--bg-2) border-b border-(--line-2) px-3">
        <SidebarMenu>
          {/*
            Collapsed state: swap the wordmark for the square mark so it stays
            inside the icon-rail width. Expanded state: left-align the wordmark
            with the rest of the sidebar's content padding.
          */}
          <SidebarMenuItem
            className={isCollapsed ? "flex items-center justify-center" : "flex items-center justify-start"}
          >
            <Image
              src={isCollapsed ? OvloxSquare : OvloxLogo}
              alt="Ovlox"
              height={isCollapsed ? 32 : 100}
              width={isCollapsed ? 32 : 100}
              className={isCollapsed ? "size-8 object-contain" : "h-8 w-auto object-contain object-left"}
              priority
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <OrganizationSwitcher organizationId={organizationId} />
      <SidebarContent className="bg-(--bg-2) gap-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
        {/* Nav Main Dashboard, Organizations, Projects */}
        <NavMain items={baseNavItems} />
        <Separator className='bg-(--line-2)' />
        {/* All Projects */}
        <ProjectSwitcher organizationId={organizationId} />
      </SidebarContent>
      <SidebarFooter className="border-t border-(--line-2) bg-(--bg-2)">
        {/* Sidebar Footer User Name, Email, Avatar */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
