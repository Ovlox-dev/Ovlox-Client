'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { listIntegrations } from '@/entities/organization/api/org';

import { IoLogoGithub } from 'react-icons/io5';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { SiDiscord, SiJira, SiLinear, SiSlack } from 'react-icons/si';

import { IntegrationStatus } from '@/types/enum';
import { OrgIntegrationStatusItem } from '@/types/api-types';

import { Card, CardContent } from '@/components/ui/card';

const AppsConnected = () => {
    const router = useRouter();
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? '';
    const [appsPage, setAppsPage] = useState(0);

    const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError } = useQuery({
        queryKey: ["listIntegrations", organizationId],
        queryFn: async () => {
            const res = await listIntegrations(organizationId)
            return res ?? null
        },
    })

    const appsWithStatus = useMemo(() => {
        const APP_CATALOG = [
            {
                id: "github",
                name: "Github",
                icon: IoLogoGithub,
                managePath: "github",
            },
            {
                id: "slack",
                name: "Slack",
                icon: SiSlack,
                managePath: "slack",
            },
            { id: "jira", name: "Jira", icon: SiJira, managePath: "jira" },
            { id: "discord", name: "Discord", icon: SiDiscord, managePath: "discord" },
            { id: "linear", name: "Linear", icon: SiLinear, managePath: "linear" },
        ];

        const integrations: OrgIntegrationStatusItem[] = integrationsData ?? [];
        const statusByAppId = new Map<string, IntegrationStatus>();
        for (const item of integrations) {
            const appId = String(item.app).toLowerCase();
            statusByAppId.set(appId, item.status);
        }

        const connectedApps = new Set(
            integrations
                .filter((item) => item.status === IntegrationStatus.CONNECTED)
                .map((item) => String(item.app).toLowerCase())
        );

        return APP_CATALOG.map((app) => ({
            ...app,
            connected: connectedApps.has(app.id),
            status: statusByAppId.get(app.id) ?? IntegrationStatus.NOT_CONNECTED,
        }));
    }, [integrationsData]);

    const connectedCount = appsWithStatus.filter((app) => app.connected).length;
    const totalApps = appsWithStatus.length;

    const appsPerPage = 4;
    const appsPageCount = Math.max(1, Math.ceil(totalApps / appsPerPage));
    const safeAppsPage = Math.min(Math.max(0, appsPage), appsPageCount - 1);

    const visibleApps = useMemo(() => {
        const start = safeAppsPage * appsPerPage;
        return appsWithStatus.slice(start, start + appsPerPage);
    }, [appsWithStatus, safeAppsPage]);

    const emptySlots = Math.max(0, appsPerPage - visibleApps.length);


    const basePath = `/${encodeURIComponent(organizationId)}/integrations`


    return (
        <div>
            <Card className="rounded-2xl border-border bg-card ">
                <CardContent className="space-y-4 flex flex-col">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted font-semibold">Apps Connected</p>
                            <span className="text-4xl font-semibold text-text-accent">
                                {connectedCount} <span className="text-base font-medium text-muted">/ {totalApps}</span>
                            </span>
                            {integrationsLoading ? <p className="text-xs text-muted mt-1">Loading integrations...</p> : null}
                            {!integrationsLoading && integrationsError ? (
                                <p className="text-xs text-muted mt-1">
                                    {integrationsError instanceof Error ? integrationsError.message : 'Failed to fetch integrations'}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <ul className="flex-1 space-y-3">
                        {visibleApps.map((app) => {
                            const Icon = app.icon;
                            return (
                                <li
                                    onClick={() => app.managePath && router.push(`${basePath}`)}
                                    key={app.id}
                                    className="group flex cursor-pointer items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2 text-text">
                                        <Icon className="size-5" />
                                        <span className="text-base font-medium">{app.name}</span>
                                    </div>
                                    {app.connected ? (
                                        <div className="flex items-center gap-2 rounded-md border-[0.5px] border-accent bg-accent px-4 py-1 text-xs text-background">
                                            <Check className="size-3.5" /> Connected
                                        </div>
                                    ) : (
                                        <div className="rounded-md bg-border px-4 py-1 text-xs font-medium text-gray-500">
                                            Not Connected
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                        {Array.from({ length: emptySlots }).map((_, idx) => (
                            <li
                                key={`apps-empty-${safeAppsPage}-${idx}`}
                                aria-hidden
                                className="group flex items-center justify-between gap-2 opacity-0 pointer-events-none select-none"
                            >
                                <div className="flex items-center gap-2 text-text">
                                    <div className="size-5" />
                                    <span className="text-base font-medium">.</span>
                                </div>
                                <div className="rounded-md bg-border px-4 py-1 text-xs font-medium">
                                    .
                                </div>
                            </li>
                        ))}
                    </ul>

                    {appsPageCount > 1 ? (
                        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setAppsPage(Math.max(0, safeAppsPage - 1))}
                                disabled={safeAppsPage <= 0}
                                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Previous apps"
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setAppsPage(Math.min(appsPageCount - 1, safeAppsPage + 1))}
                                disabled={safeAppsPage >= appsPageCount - 1}
                                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Next apps"
                            >
                                <ChevronRight className="size-5" />
                            </button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    )
}

export default AppsConnected;