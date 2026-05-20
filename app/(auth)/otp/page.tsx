import { Suspense } from "react"
import { OTPForm } from "@/features/auth";
import { AuthShell } from "@/components/layout/auth-shell";

export default function OTP() {
    return (
        <AuthShell>
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-3xl">
                    <Suspense fallback={<AuthLoading />}>
                        <OTPForm />
                    </Suspense>
                </div>
            </div>
        </AuthShell>
    )
}

function AuthLoading() {
    return (
        <div className="text-center text-sm text-(--fg-3) font-mono">
            Loading…
        </div>
    );
}
