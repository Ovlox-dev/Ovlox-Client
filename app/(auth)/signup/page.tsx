import { Suspense } from "react"
import { SignupForm } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Signup() {
    return (
        <AuthShell>
            <Suspense fallback={<AuthLoading />}>
                <SignupForm />
            </Suspense>
        </AuthShell>
    )
}

function AuthLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center text-sm text-(--fg-3) font-mono">
            Loading…
        </div>
    );
}
