"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/entities/auth/model/store";
import { canAccessRoute, getRouteAccessPolicy } from "@/shared/lib/auth/route-config";
import {
    buildSigninRedirectPath,
    resolvePostLoginAuthNavigation,
    setAuthNavigation,
} from "@/shared/lib/auth/auth-navigation";
import { Card } from "@/components/ui/card";
import { LoaderSpinner } from "@/shared/ui/LoaderSpinner";

const VERIFY_EMAIL_PATH = "/verify-email";

export default function Protected({ children }: { children: React.ReactNode }) {
    const { user, isLoading, authStatus, bootstrapSession } = useAuthStore((state) => state.auth);
    const router = useRouter();
    const pathname = usePathname();
    const routePolicy = getRouteAccessPolicy(pathname);
    const requiresAuth = routePolicy.requiresAuth;
    const redirectIfAuthenticated = routePolicy.redirectIfAuthenticated ?? false;
    const hasRouteAccess = canAccessRoute(pathname, user?.role ?? null);
    const onVerifyEmailPage = pathname === VERIFY_EMAIL_PATH;
    const needsEmailVerification =
        authStatus === "authenticated" && Boolean(user) && user!.isVerified === false;
    /** Unverified signed-in user on verify-email (stable while authStatus is briefly "loading" during OTP). */
    const verifyEmailPending =
        onVerifyEmailPage && Boolean(user) && user!.isVerified === false;
    /** Avoid full-screen loader on verify-email when `/user/me` or OTP verify sets global loading (would unmount the page and loop). */
    const showVerifyEmailShell = verifyEmailPending;

    useEffect(() => {
        bootstrapSession().catch(() => {
            // Do nothing
        });
    }, [bootstrapSession]);

    useEffect(() => {
        // Do not redirect while session is unknown: `idle` happens on first paint before
        // `bootstrapSession` flushes `loading`, and would otherwise send users to /signin briefly.
        if (authStatus === "loading" || authStatus === "idle") { return; }
        if (!requiresAuth) {
            if (!redirectIfAuthenticated) { return; }
            if (authStatus !== "authenticated" || !user) { return; }
            if (!user.isVerified) {
                router.replace(VERIFY_EMAIL_PATH);
                return;
            }
            router.replace(resolvePostLoginAuthNavigation("/login-success"));
            return;
        }
        if (authStatus === "authenticated" && user) {
            if (!user.isVerified && !onVerifyEmailPage) {
                router.replace(VERIFY_EMAIL_PATH);
            }
            return;
        }
        if (authStatus !== "unauthenticated") { return; }

        const currentPath =
            typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}${window.location.hash}`
                : pathname;
        setAuthNavigation(currentPath);
        router.replace(buildSigninRedirectPath());
    }, [
        authStatus,
        onVerifyEmailPage,
        pathname,
        redirectIfAuthenticated,
        requiresAuth,
        router,
        user,
    ]);

    if (
        (!showVerifyEmailShell && (isLoading || authStatus === "loading")) ||
        (requiresAuth && authStatus !== "authenticated" && !verifyEmailPending) ||
        (requiresAuth && needsEmailVerification && !onVerifyEmailPage)
    ) {
        return <LoaderSpinner />;
    }

    if (user && !hasRouteAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md p-6 space-y-3 shadow-lg text-center">
                    <h2 className="text-xl font-semibold">Access denied</h2>
                    <p className="text-sm text-muted-foreground">
                        Your account is signed in, but it does not have permission to view this page.
                    </p>
                    {/* <Button onClick={() => router.replace("/login-success")}>Go to workspace</Button> */}
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
