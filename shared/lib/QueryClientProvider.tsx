// providers/query-provider.tsx
"use client"

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { setSharedQueryClient } from "@/shared/lib/query-client-registry"

/** Best-effort extraction of a human-readable message from an unknown mutation error.
 *  Handles axios-style error bodies ({ response: { data: { message } } }) and plain Errors. */
function getMutationErrorMessage(error: unknown): string {
    const err = error as {
        response?: { data?: { message?: unknown; error?: unknown } }
        message?: unknown
    } | null
    const apiMessage = err?.response?.data?.message ?? err?.response?.data?.error
    if (typeof apiMessage === "string" && apiMessage.length > 0) { return apiMessage }
    if (typeof err?.message === "string" && err.message.length > 0) { return err.message }
    return "Something went wrong. Please try again."
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                // Global backstop so mutations that don't define their own onError no longer
                // fail silently. Per-mutation onError still runs (this does not replace it).
                mutationCache: new MutationCache({
                    onError: (error) => {
                        toast.error(getMutationErrorMessage(error))
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        retry: 2,
                    },
                },
            })
    )

    // Expose this client to the session layer so logout / auth-failure can wipe the cache
    // (prevents the previous user's cached data leaking into the next sign-in).
    useEffect(() => {
        setSharedQueryClient(queryClient)
        return () => setSharedQueryClient(null)
    }, [queryClient])

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}