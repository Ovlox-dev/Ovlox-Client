'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { listIntegrations } from '@/shared/api/org';

import { IoLogoGithub } from 'react-icons/io5';
import { Check } from 'lucide-react';
import { SiDiscord, SiJira, SiLinear, SiSlack } from 'react-icons/si';

import { IntegrationStatus } from '@/types/enum';
import { OrgIntegrationStatusItem } from '@/types/api-types';

import { Card, CardContent } from '@/components/ui/card';

const AppsConnected = () => {
    const router = useRouter();
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? '';

    const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError } = useQuery({
        queryKey: ["listIntegrations", organizationId],
        queryFn: async () => {
            const res = await listIntegrations(organizationId)
            return res ?? null
        },
    })

    const integrationId = integrationsData?.find((item) => item.status === IntegrationStatus.CONNECTED)?.integrationId ?? '';

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
    }, [integrationsData, organizationId]);

    const connectedCount = appsWithStatus.filter((app) => app.connected).length;
    const totalApps = appsWithStatus.length;


    const basePath = `/${encodeURIComponent(organizationId)}/integrations`


    return (
        <div>
            <Card className="rounded-2xl border-border bg-card">
                <CardContent className="space-y-4">
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
                    <ul className="space-y-3">
                        {appsWithStatus.map((app) => {
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
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}

export default AppsConnected;