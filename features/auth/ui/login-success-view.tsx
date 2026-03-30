"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/entities/auth/model/store";
import { setAuthNavigation } from "@/shared/lib/auth/auth-navigation";
import { resolvePostAuthOrgRedirect } from "@/shared/lib/auth/post-auth-org-resolver";
import { Loader2 } from "lucide-react";

export function LoginSuccessView() {
    const router = useRouter();
    const { user, isLoading } = useAuthStore((s) => s.auth);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            setAuthNavigation("/login-success");
            return;
        }

        let cancelled = false;
        void (async () => {
            const { redirectTo } = await resolvePostAuthOrgRedirect();
            if (!cancelled) router.replace(redirectTo);
        })();

        return () => {
            cancelled = true;
        };
    }, [isLoading, user, router]);

    if (isLoading && !user) {
        return (
            <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
                <Card className="w-full border-none shadow-none">
                    <CardContent className="flex flex-col items-center gap-4 py-12">
                        <Loader2 className="size-10 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Restoring your session…</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
            <Card className="w-full border-none shadow-none">
                <CardContent className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="size-10 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Taking you to your workspace…</p>
                </CardContent>
            </Card>
        </div>
    );
}
