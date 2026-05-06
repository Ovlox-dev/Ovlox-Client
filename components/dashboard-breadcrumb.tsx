"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LABEL_MAP: Record<string, string> = {
    dashboard: "Dashboard",
    organizations: "Organizations",
    projects: "Projects",
    new: "New",
    insights: "Insights",
    chat: "AI Assistant",
    tasks: "Tasks",
    events: "Events",
    analysis: "Updates",
    page: "Overview",
}

function formatSegment(segment: string) {
    if (LABEL_MAP[segment]) { return LABEL_MAP[segment]; }
    const decoded = decodeURIComponent(segment)
    if (decoded.length > 18) { return `${decoded.slice(0, 15)}...`; }
    return decoded.charAt(0).toUpperCase() + decoded.slice(1)
}

export function DashboardBreadcrumb() {
    const pathname = usePathname()
    const segments = React.useMemo(() => pathname.split("/").filter(Boolean), [pathname])

    if (segments.length === 0) { return null; }

    const breadcrumbs = segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/")
        return {
            label: formatSegment(segment),
            href,
            isLast: idx === segments.length - 1,
        }
    })

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((item, idx) => (
                    <React.Fragment key={item.href}>
                        <BreadcrumbItem className={idx === 0 ? "hidden md:block" : undefined}>
                            {item.isLast ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!item.isLast && (
                            <BreadcrumbSeparator className={idx === 0 ? "hidden md:block" : undefined} />
                        )}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
