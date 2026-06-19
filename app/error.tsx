"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    React.useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("[app-error-boundary]", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    An unexpected error occurred. You can try again, and if the problem
                    persists, refresh the page.
                </p>
                <div className="mt-6 flex justify-center">
                    <Button onClick={() => reset()}>Try again</Button>
                </div>
            </div>
        </div>
    );
}
