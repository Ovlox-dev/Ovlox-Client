import { apiBaseUrl } from "@/shared/api/client";

/**
 * Generic Server-Sent Events helper. The backend exposes three SSE streams (project readiness,
 * chat job phase + token chunks, integration health) — all share the same JSON-line wire format
 * and benefit from a common subscribe + auto-cleanup helper.
 *
 * Returns the underlying EventSource so callers can `.close()` it imperatively in addition to
 * using the `unsubscribe` callback for React effect teardown.
 */
export interface SseSubscription {
    eventSource: EventSource;
    unsubscribe: () => void;
}

export function createEventSource<T = unknown>(
    url: string,
    handlers: {
        onMessage: (data: T) => void;
        onError?: (error: Event) => void;
        onOpen?: () => void;
    },
): SseSubscription {
    const eventSource = new EventSource(url, { withCredentials: true });

    const messageHandler = (event: MessageEvent) => {
        try {
            const parsed = JSON.parse(event.data) as T;
            handlers.onMessage(parsed);
        } catch {
            // Some backends emit raw strings — surface as-is rather than dropping.
            handlers.onMessage(event.data as unknown as T);
        }
    };

    eventSource.addEventListener("message", messageHandler);
    if (handlers.onOpen) { eventSource.addEventListener("open", handlers.onOpen); }
    if (handlers.onError) { eventSource.addEventListener("error", handlers.onError); }

    const unsubscribe = () => {
        eventSource.removeEventListener("message", messageHandler);
        eventSource.close();
    };

    return { eventSource, unsubscribe };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Domain wrappers — typed payloads matching the backend's published SSE shapes */
/* ────────────────────────────────────────────────────────────────────────── */

export type ReadinessSnapshot = {
    projectId: string;
    contextReadiness: "EMPTY" | "BUILDING" | "READY" | "ERROR";
    jobs: { total: number; completed: number; failed: number; inflight: number };
};

/**
 * Subscribe to /projects/:id/readiness/stream. The backend publishes one event per
 * BackfillProcessor completion + an initial snapshot on connect.
 */
export function streamProjectReadiness(
    orgId: string,
    projectId: string,
    onSnapshot: (snap: ReadinessSnapshot) => void,
    onError?: (error: Event) => void,
): SseSubscription {
    const url = `${apiBaseUrl}/orgs/${orgId}/projects/${projectId}/readiness/stream`;
    return createEventSource<ReadinessSnapshot>(url, { onMessage: onSnapshot, onError });
}

export type JobStatusEvent =
    | { jobId: string; status?: string; attempts?: number; payload?: unknown; updatedAt?: string; completed?: boolean; userId?: string; error?: string }
    | { jobId: string; userId?: string; kind: "chunk"; seq: number; delta: string }
    | { jobId: string; userId?: string; kind: "answer"; answer: string; chatMessageId?: string; partialContext?: boolean };

/**
 * Subscribe to /chat/jobs/:jobId/stream. Mirrors the WebSocket `chatChunk`/`newMessage` events
 * for environments where WebSocket is unavailable.
 */
export function streamJobStatus(
    jobId: string,
    onEvent: (event: JobStatusEvent) => void,
    onError?: (error: Event) => void,
): SseSubscription {
    const url = `${apiBaseUrl}/chat/jobs/${jobId}/stream`;
    return createEventSource<JobStatusEvent>(url, { onMessage: onEvent, onError });
}

/**
 * Subscribe to /orgs/integrations/status/:slug. Re-emits whenever IntegrationCacheService
 * invalidates that org's integration cache (OAuth complete, token refresh, webhook landed, etc.).
 */
export function streamIntegrationStatus(
    orgSlug: string,
    onSnapshot: (snap: unknown) => void,
    onError?: (error: Event) => void,
): SseSubscription {
    const url = `${apiBaseUrl}/orgs/integrations/status/${orgSlug}`;
    return createEventSource(url, { onMessage: onSnapshot, onError });
}