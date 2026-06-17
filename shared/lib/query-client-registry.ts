import type { QueryClient } from "@tanstack/react-query";

/**
 * Holds a reference to the app's active React Query client so non-React code (the auth/session layer)
 * can wipe the cache on logout / session loss. Without this, the previous user's cached data
 * (["userOrgs"], projects, org details, …) survives a logout and the NEXT user who signs in is
 * briefly served the prior user's data until each query goes stale — a cross-user data leak.
 *
 * We register the per-tree client created in QueryProvider (rather than using a module-singleton
 * QueryClient) to stay compatible with the Next.js App Router SSR pattern.
 */
let activeClient: QueryClient | null = null;

export function setSharedQueryClient(client: QueryClient | null): void {
    activeClient = client;
}

/** Clear all cached/queued queries. Safe no-op if no client is registered yet. */
export function clearSharedQueryCache(): void {
    activeClient?.clear();
}
