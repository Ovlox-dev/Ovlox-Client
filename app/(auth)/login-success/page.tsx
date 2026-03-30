import { Suspense } from "react";
import { LoginSuccessView } from "@/features/auth";

export default function LoginSuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                    Loading…
                </div>
            }
        >
            <LoginSuccessView />
        </Suspense>
    );
}
