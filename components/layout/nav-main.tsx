"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

function isRouteActive(pathname: string, url: string): boolean {
    return pathname === url
}

export function NavMain({
    items,
}: {
    items: {
        title: string
        url?: string
        icon?: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url?: string
            disabled?: boolean
        }[]
    }[]
}) {
    const pathname = usePathname()

    return (
        <SidebarGroup className="pt-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const hasChildren = !!item.items && item.items.length > 0
                    const itemActive =
                        !!item.url && isRouteActive(pathname, item.url)
                    const hasActiveChild =
                        hasChildren &&
                        item.items?.some(
                            (sub) =>
                                !!sub.url && isRouteActive(pathname, sub.url)
                        )

                    if (!hasChildren) {
                        const hasUrl = !!item.url
                        return (
                            <SidebarMenuItem key={item.title}>
                                {hasUrl ? (
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={itemActive}
                                    >
                                        <Link href={item.url!}>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={false}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                )}
                            </SidebarMenuItem>
                        )
                    }

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={
                                itemActive || hasActiveChild || !!item.isActive
                            }
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={itemActive}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => {
                                            const subHasUrl = !!subItem.url
                                            const subDisabled = !!subItem.disabled
                                            const subActive =
                                                subHasUrl &&
                                                !subDisabled &&
                                                isRouteActive(
                                                    pathname,
                                                    subItem.url!
                                                )
                                            return (
                                                <SidebarMenuSubItem
                                                    key={`${subItem.title}-${subDisabled ? "disabled" : "enabled"}`}
                                                >
                                                    {subDisabled ? (
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={false}
                                                            aria-disabled="true"
                                                            className="pointer-events-none cursor-not-allowed opacity-50"
                                                        >
                                                            <span tabIndex={-1}>
                                                                <span>
                                                                    {
                                                                        subItem.title
                                                                    }
                                                                </span>
                                                            </span>
                                                        </SidebarMenuSubButton>
                                                    ) : subHasUrl ? (
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={subActive}
                                                        >
                                                            <Link
                                                                href={
                                                                    subItem.url!
                                                                }
                                                            >
                                                                <span>
                                                                    {
                                                                        subItem.title
                                                                    }
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    ) : (
                                                        <SidebarMenuSubButton
                                                            isActive={false}
                                                        >
                                                            <span>
                                                                {
                                                                    subItem.title
                                                                }
                                                            </span>
                                                        </SidebarMenuSubButton>
                                                    )}
                                                </SidebarMenuSubItem>
                                            )
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}