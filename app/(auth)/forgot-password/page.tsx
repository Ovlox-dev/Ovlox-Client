import { Suspense } from "react";
import { ForgotPasswordForm } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ForgotPassword() {
    return (
        <AuthShell>
            <Suspense fallback={<AuthLoading />}>
                <ForgotPasswordForm />
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
