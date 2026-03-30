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
            if (cancelled) return;
            const { user } = useAuthStore.getState().auth;
            if (!user) {
                router.replace("/signin");
                return;
            }
            const orgId = getActiveOrgId();
            router.replace(
                orgId ? buildDashboardOrgRoute(orgId) : DASHBOARD_NEW_ORGANIZATION_ROUTE
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [bootstrapSession, router]);

    return (
        <LoaderSpinner />
    );
}
