import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth";

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                    Loading…
                </div>
            }
        >
            <VerifyEmailView />
        </Suspense>
    );
}
