// providers/query-provider.tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { setSharedQueryClient } from "@/shared/lib/query-client-registry"

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                // NOTE: deliberately NO global MutationCache.onError — in react-query v5 it fires IN
                // ADDITION to (not instead of) each mutation's own onError, so a global toast here
                // double-toasts with the ~15 mutations that already surface their own errors. Error
                // feedback is handled per-mutation; add an onError where a specific mutation lacks one.
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
