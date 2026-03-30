'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { IoLogoGithub } from 'react-icons/io5';
import { SiDiscord, SiJira, SiLinear, SiSlack } from 'react-icons/si';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getGithubInstallUrl } from '@/shared/api/integration-github';
import { listIntegrations, subscribeToIntegrationStatus } from '@/services/integration.service';
import { OrgIntegrationStatusItem } from '@/types/api-types';
import { IntegrationStatus } from '@/types/enum';
import { toast } from "sonner";

const APP_CATALOG = [
    { id: "github", name: "Github", icon: IoLogoGithub, installUrl: null },
    { id: "slack", name: "Slack", icon: SiSlack, installUrl: null },
    { id: "jira", name: "Jira", icon: SiJira, installUrl: null },
    { id: "discord", name: "Discord", icon: SiDiscord, installUrl: null },
    { id: "linear", name: "Linear", icon: SiLinear, installUrl: null },
];

const AppsConnected = () => {
    const params = useParams<{ organizationId: string }>();
    const router = useRouter();
    const organizationId = params?.organizationId ?? '';
    const [connectingAppId, setConnectingAppId] = useState<string | null>(null);
    const [integrations, setIntegrations] = useState<OrgIntegrationStatusItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const appsWithStatus = useMemo(() => {
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
    }, [integrations]);

    const connectedCount = appsWithStatus.filter((app) => app.connected).length;
    const totalApps = appsWithStatus.length;

    useEffect(() => {
        if (!organizationId) {
            setIntegrations([]);
            return;
        }

        let cancelled = false;
        let cleanupSse: (() => void) | null = null;
        let githubWasConnected = false;

        const fetchIntegrations = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await listIntegrations(organizationId);
                if (!cancelled) {
                    setIntegrations(response);
                    githubWasConnected = response.some(
                        (i) => String(i.app).toLowerCase() === "github" && i.status === IntegrationStatus.CONNECTED
                    );
                }

                cleanupSse = subscribeToIntegrationStatus(organizationId, (items) => {
                    if (cancelled) return;
                    setIntegrations(items);

                    const githubConnectedNow = items.some(
                        (i) => String(i.app).toLowerCase() === "github" && i.status === IntegrationStatus.CONNECTED
                    );
                    if (!githubWasConnected && githubConnectedNow) {
                        toast.success("GitHub connected");
                    }
                    githubWasConnected = githubConnectedNow;
                });
            } catch (fetchError) {
                if (!cancelled) {
                    setIntegrations([]);
                    setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch integrations');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void fetchIntegrations();

        return () => {
            cancelled = true;
            cleanupSse?.();
        };
    }, [organizationId]);

    const handleInstall = async (appId: string, installUrl: string | null) => {
        if (installUrl) {
            window.location.href = installUrl;
            return;
        }

        if (appId !== "github" || !organizationId) return;

        try {
            setConnectingAppId(appId);
            const response = await getGithubInstallUrl(organizationId);
            if (response?.url) {
                window.location.href = response.url;
            }
        } catch (error) {
            console.error("Failed to start GitHub install flow:", error);
        } finally {
            setConnectingAppId(null);
        }
    };

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
                            {loading ? <p className="text-xs text-muted mt-1">Loading integrations...</p> : null}
                            {!loading && error ? <p className="text-xs text-muted mt-1">{error}</p> : null}
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {appsWithStatus.map((app) => {
                            const Icon = app.icon;
                            return (
                                <li
                                    key={app.id}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2 text-text">
                                        <Icon className="size-5" />
                                        <span className="text-base font-medium">{app.name}</span>
                                    </div>
                                    {app.connected ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (app.id === "github") {
                                                    router.push(`/${encodeURIComponent(organizationId)}/integrations/github`);
                                                } else {
                                                    router.push(`/${encodeURIComponent(organizationId)}/integrations`);
                                                }
                                            }}
                                            className="flex items-center gap-2 border-[0.5px] border-border bg-background rounded-md px-4 py-1 text-xs text-text hover:bg-muted transition-colors"
                                        >
                                            <Check className="size-3.5" /> Connected
                                        </button>
                                    ) : app.status === IntegrationStatus.PROCESSING ? (
                                        <button
                                            disabled
                                            className="px-4 py-1 text-xs font-medium bg-muted rounded-md text-muted-foreground disabled:opacity-80 disabled:cursor-not-allowed"
                                        >
                                            Connecting...
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => void handleInstall(app.id, app.installUrl)}
                                            className="px-4 py-1 text-xs font-medium bg-accent rounded-md text-background disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {connectingAppId === app.id ? "Connecting..." : "Connect"}
                                        </button>
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