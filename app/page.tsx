"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/entities/auth/model/store";
import {
    buildDashboardOrgRoute,
    DASHBOARD_NEW_ORGANIZATION_ROUTE,
    getActiveOrgId,

} from "@/shared/lib/auth/post-auth-org-resolver";
import { LoaderSpinner } from "@/shared/ui/LoaderSpinner";
import { userOrgs } from "@/shared/api/org";

export default function Home() {
    const router = useRouter();
    const bootstrapSession = useAuthStore((s) => s.auth.bootstrapSession);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                await bootstrapSession();
            } catch {
                // Session bootstrap errors are reflected in store state; still decide redirect below.
            }
            if (cancelled) { return; }
            const { user } = useAuthStore.getState().auth;
            if (!user) {
                router.replace("/signin");
                return;
            }
            const orgId = getActiveOrgId();
            if (orgId) {
                router.replace(buildDashboardOrgRoute(orgId));
                return;
            }

            try {
                const response = await userOrgs();
                if (cancelled) { return; }

                const orgs = response?.data ?? [];
                const firstOrgId = orgs?.[0]?.id;
                router.replace(
                    firstOrgId ? buildDashboardOrgRoute(firstOrgId) : DASHBOARD_NEW_ORGANIZATION_ROUTE
                );
            } catch {
                if (cancelled) { return; }
                router.replace(DASHBOARD_NEW_ORGANIZATION_ROUTE);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [bootstrapSession, router]);

    return (
        <LoaderSpinner />
    );
}
