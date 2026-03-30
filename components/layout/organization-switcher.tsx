"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import Link from "next/link";
import { userOrgs } from "@/shared/api/org";
import {
  buildDashboardOrgRoute,
  setActiveOrgId,
} from "@/shared/lib/auth/post-auth-org-resolver";
import type { IOrganization } from "@/types/prisma-generated";

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
  const [orgs, setOrgs] = useState<IOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await userOrgs();
        if (!cancelled) setOrgs(response.data ?? []);
      } catch {
        if (!cancelled) setOrgs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrg =
    orgs.find((o) => o.id === organizationId) ??
    (orgs.length === 1 ? orgs[0] : undefined);

  const displayName = loading
    ? "Loading…"
    : activeOrg?.name ?? (organizationId ? "Organization" : "Select organization");
  const displaySubtitle = activeOrg?.slug ?? "";

  const handleSelectOrg = useCallback(
    (id: string) => {
      setActiveOrgId(id);
      router.push(buildDashboardOrgRoute(id));
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

  return (
    <SidebarMenu className="p-2 bg-background">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="bg-card">
              <Avatar className="h-8 w-8 rounded-lg">
                {activeOrg ? (
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(activeOrg.name)}
                  </AvatarFallback>
                ) : (
                  <AvatarFallback className="text-xs font-medium">—</AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-medium text-[#E5E7EB] truncate">{displayName}</span>
                {displaySubtitle ? (
                  <span className="text-xs text-muted truncate">{displaySubtitle}</span>
                ) : null}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) border-sidebar-border min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {orgs.length === 0 && !loading ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No organizations</div>
            ) : (
              <div className="space-y-1">
                {orgs.map((org) => {
                  const isCurrent = org.id === organizationId;
                  return (
                    <DropdownMenuItem
                      key={org.id}
                      className="flex cursor-pointer items-center gap-2"
                      onSelect={() => handleSelectOrg(org.id)}
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
            <DropdownMenuSeparator className="bg-sidebar-border" />
            <Link href="/new-organization">
              <DropdownMenuItem className="flex cursor-pointer items-center justify-center border bg-white font-medium text-background hover:border-white hover:bg-transparent hover:text-white">
                <Plus strokeWidth={2.5} className="hover:text-white" />
                Add Organization
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
