import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ResetPassword() {
    return (
        <AuthShell>
            <Suspense fallback={<AuthLoading />}>
                <ResetPasswordForm />
            </Suspense>
        </AuthShell>
    );
}

function AuthLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center text-sm text-(--fg-3) font-mono">
            Loading…
        </div>
    );
}
