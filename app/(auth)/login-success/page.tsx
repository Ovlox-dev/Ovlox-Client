import { Suspense } from "react";
import { LoginSuccessView } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function LoginSuccessPage() {
    return (
        <AuthShell>
            <Suspense
                fallback={
                    <div className="flex min-h-screen items-center justify-center text-sm text-(--fg-3) font-mono">
                        Loading…
                    </div>
                }
            >
                <LoginSuccessView />
            </Suspense>
        </AuthShell>
    );
}
