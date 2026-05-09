import { Suspense } from "react"
import { SigninForm } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Signin() {
    return (
        <AuthShell>
            <Suspense fallback={<AuthLoading />}>
                <SigninForm />
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
