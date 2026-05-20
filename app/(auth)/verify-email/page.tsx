import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function VerifyEmailPage() {
    return (
        <AuthShell>
            <Suspense
                fallback={
                    <div className="flex min-h-screen items-center justify-center text-sm text-(--fg-3) font-mono">
                        Loading…
                    </div>
                }
            >
                <VerifyEmailView />
            </Suspense>
        </AuthShell>
    );
}
