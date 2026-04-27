import { Suspense } from "react";
import { AcceptInviteView } from "./accept-invite-view";

export default function InvitePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                    Loading…
                </div>
            }
        >
            <AcceptInviteView />
        </Suspense>
    );
}
