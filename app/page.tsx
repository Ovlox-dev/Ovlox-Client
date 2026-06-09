"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/entities/auth/model/store";
import { resolvePostAuthOrgRedirect } from "@/shared/lib/auth/post-auth-org-resolver";
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
            if (cancelled) { return; }
            const { user } = useAuthStore.getState().auth;
            if (!user) {
                router.replace("/signin");
                return;
            }
            try {
                const { redirectTo } = await resolvePostAuthOrgRedirect();
                if (cancelled) { return; }
                router.replace(redirectTo);
            } catch {
                if (cancelled) { return; }
                router.replace("/new-organization");
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
