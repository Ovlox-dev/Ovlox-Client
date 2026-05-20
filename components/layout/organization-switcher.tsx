"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import type { IOrganization } from "@/types/prisma-generated";
import { userOrgs } from "@/entities/organization/api/org";
import { buildDashboardOrgRoute, setActiveOrgId, } from "@/shared/lib/auth/post-auth-org-resolver";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarMenu, SidebarMenuItem, useSidebar ,SidebarMenuButton} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface OrganizationSwitcherProps {
  organizationId: string;
}

export function OrganizationSwitcher({ organizationId }: OrganizationSwitcherProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["userOrgs"],
    queryFn: () => userOrgs().then(res => res.data ?? []),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // `organizationId` from the URL may be a slug (post-migration) or a UUID
  // (legacy bookmarks) — match against either.
  const activeOrg =
    data.find((o) => o.slug === organizationId || o.id === organizationId) ??
    (data.length === 1 ? data[0] : undefined);

  const displayName = isLoading
    ? "Loading…"
    : activeOrg?.name ?? (organizationId ? "Organization" : "Select organization");
  const displaySubtitle = activeOrg?.slug ?? "";

  const handleSelectOrg = useCallback(
    (org: IOrganization) => {
      const identifier = org.slug || org.id;
      setActiveOrgId(identifier);
      router.push(buildDashboardOrgRoute(identifier));
    },
    [router]
  );

  const AvatarForOrg = ({ org, size = "md" }: { org: IOrganization; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    };
    return (
      <Avatar className={`${sizeClasses[size]} rounded-lg`}>
        <AvatarFallback className="text-xs font-medium">{getInitials(org.name)}</AvatarFallback>
      </Avatar>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Error loading organizations</p>
      </div>
    );
  }

  return (
    <SidebarMenu className="p-2 bg-(--bg-2)">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="bg-(--bg-3) border border-(--line-2) hover:border-(--line) data-[state=open]:border-(--line)">
              <Avatar className="h-8 w-8 rounded-md border border-(--line-2)">
                {activeOrg ? (
                  <AvatarFallback className="text-xs font-semibold bg-(--bg-2) text-(--accent-lime)">
                    {getInitials(activeOrg.name)}
                  </AvatarFallback>
                ) : (
                  <AvatarFallback className="text-xs font-medium bg-(--bg-2) text-(--fg-3)">—</AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-medium text-(--fg) truncate">{displayName}</span>
                {displaySubtitle ? (
                  <span className="text-xs text-(--fg-3) truncate font-mono">{displaySubtitle}</span>
                ) : null}
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-(--fg-3)" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) bg-(--bg-2) border border-(--line) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-[10px] text-(--fg-3) font-mono uppercase tracking-wider">
              Organizations
            </DropdownMenuLabel>
            {data.length === 0 && !isLoading ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No organizations</div>
            ) : (
              <div className="space-y-1">
                {data.map((org) => {
                  const isCurrent = org.slug === organizationId || org.id === organizationId;
                  return (
                    <DropdownMenuItem
                      key={org.id}
                      className="flex cursor-pointer items-center gap-2"
                      onSelect={() => handleSelectOrg(org)}
                    >
                      <AvatarForOrg org={org} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium">{org.name}</div>
                        {org.slug ? (
                          <div className="truncate text-xs text-muted-foreground">{org.slug}</div>
                        ) : null}
                      </div>
                      {isCurrent ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
            <DropdownMenuSeparator className="bg-(--line-2)" />
            <Link href="/new-organization">
              <DropdownMenuItem className="flex cursor-pointer items-center justify-center gap-2 border border-(--accent-lime) bg-(--accent-lime) font-semibold text-[#07070a] hover:bg-(--accent-lime)/90 focus:bg-(--accent-lime)/90 mt-1">
                <Plus strokeWidth={2.5} />
                Add Organization
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
