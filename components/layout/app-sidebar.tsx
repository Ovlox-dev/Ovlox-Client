"use client"

import { useMemo } from "react"
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
import { useOrgByIdentifier, useOrgIntegrations } from "@/shared/queries/org.queries"
import { useOrgStore } from "@/shared/lib/organization/org-store"
import { isProviderConnected } from "@/widgets/integrations/model/integration-utils"

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

type NavSubItem = {
  title: string
  url?: string
  providerId?: string
  requiredPermission?: PermissionName
  disabled?: boolean
}
type NavItem = {
  title: string
  url?: string
  icon?: typeof LayoutDashboard
  isActive?: boolean
  requiredPermission?: PermissionName
  items?: NavSubItem[]
}
type PublicNavSubItem = {
  title: string
  url?: string
  disabled?: boolean
}
type PublicNavItem = Omit<NavItem, "requiredPermission" | "items"> & {
  items?: PublicNavSubItem[]
}

export function AppSidebar() {
  const params = useParams()
  const routeIdentifier = (params?.organizationId as string) ?? ""
  const sessionUser = useAuthStore((s) => s.auth.user)
  const currentOrg = useOrgStore((s) => s.currentOrg)
  const { data: orgData } = useOrgByIdentifier(routeIdentifier)
  const org = orgData?.organization
  const resolvedOrgId =
    org?.id ??
    (currentOrg?.slug === routeIdentifier || currentOrg?.id === routeIdentifier
      ? currentOrg.id
      : "")
  const orgSlug = org?.slug ?? currentOrg?.slug ?? routeIdentifier

  const { can, isLoading: isPermissionLoading } = usePermission(routeIdentifier || null)
  const {
    data: integrationsData,
    isLoading: integrationsLoading,
    isFetching: integrationsFetching,
  } = useOrgIntegrations(resolvedOrgId)
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"
  const integrationsPending = integrationsLoading || integrationsFetching || !resolvedOrgId

  const allNavItems: NavItem[] = useMemo(() => {
    const integrationBase = `/${orgSlug}/integrations`

    return [
      {
        title: "Dashboard",
        url: `/${orgSlug}/dashboard`,
        icon: LayoutDashboard,
        requiredPermission: PermissionName.VIEW_PROJECTS,
      },
      {
        title: "Integrations",
        icon: Plug,
        url: integrationBase,
        isActive: true,
        requiredPermission: PermissionName.MANAGE_INTEGRATIONS,
        items: [
          { title: "All", url: integrationBase },
          // Native per-provider manage pages removed — connect via Nango on the "All" page.
        ],
      },
      {
        title: "Members",
        icon: Users,
        url: `/${orgSlug}/members`,
        requiredPermission: PermissionName.INVITE_MEMBERS,
      },
      {
        title: "Settings",
        icon: Settings,
        url: `/${orgSlug}/settings`,
        requiredPermission: PermissionName.MANAGE_ORG,
      },
      {
        title: "Organizations",
        icon: Users,
        isActive: true,
        items: [
          { title: "All Organizations", url: `/${orgSlug}/organizations` },
          { title: "New Organization", url: "/new-organization" },
        ],
      },
      {
        title: "Projects",
        icon: GitBranch,
        isActive: true,
        items: [
          { title: "All Projects", url: `/${orgSlug}/projects`, requiredPermission: PermissionName.VIEW_PROJECTS },
          { title: "New Project", url: `/${orgSlug}/projects/new-project`, requiredPermission: PermissionName.CREATE_PROJECTS },
        ],
      },
    ]
  }, [orgSlug])

  /**
   * Permission-gate before rendering. While the membership query is in-flight we keep all items visible
   * (avoids a flash of empty nav) — the backend still 403s if a viewer clicks something they shouldn't see.
   */
  const navItems: PublicNavItem[] = useMemo(() => {
    const integrations = integrationsData ?? []

    const permissionFiltered: PublicNavItem[] =
      isPermissionLoading || !routeIdentifier
        ? allNavItems.map(({ requiredPermission: _omit, ...rest }) => rest)
        : allNavItems
            .filter((item) => !item.requiredPermission || can(item.requiredPermission))
            .map((item) => {
              const { requiredPermission: _omit, items, ...rest } = item
              if (!items) { return rest }
              const allowedSubItems = items.filter((sub) => !sub.requiredPermission || can(sub.requiredPermission))
              if (allowedSubItems.length === 0) { return null }
              return {
                ...rest,
                items: allowedSubItems.map(({ requiredPermission: _o, providerId: _p, ...subRest }) => subRest),
              }
            })
            .filter((item): item is PublicNavItem => item !== null)

    return permissionFiltered.map((item) => {
      if (item.title !== "Integrations" || !item.items) { return item }

      const sourceItems = allNavItems.find((navItem) => navItem.title === "Integrations")?.items ?? []

      return {
        ...item,
        items: item.items.map((subItem) => {
          const source = sourceItems.find((entry) => entry.title === subItem.title)
          const providerId = source?.providerId
          if (!providerId) { return subItem }

          const connected = isProviderConnected(integrations, providerId)
          const disabled = integrationsPending || !connected

          if (!disabled) {
            return {
              title: subItem.title,
              url: source.url ?? subItem.url,
            }
          }

          return {
            title: subItem.title,
            disabled: true,
          }
        }),
      }
    })
  }, [
    allNavItems,
    can,
    integrationsData,
    integrationsPending,
    isPermissionLoading,
    routeIdentifier,
  ])

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
      <OrganizationSwitcher organizationId={routeIdentifier} />
      <SidebarContent className="bg-(--bg-2) gap-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
        {/* Nav Main Dashboard, Organizations, Projects */}
        <NavMain items={navItems} />
        <Separator className='bg-(--line-2)' />
        {/* All Projects */}
        <ProjectSwitcher organizationId={routeIdentifier} />
      </SidebarContent>
      <SidebarFooter className="border-t border-(--line-2) bg-(--bg-2)">
        {/* Sidebar Footer User Name, Email, Avatar */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
