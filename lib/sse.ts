import { apiBaseUrl } from "@/shared/api/client";
import { getAccessToken } from "@/shared/lib/auth/token-service";

/**
 * Generic Server-Sent Events helper. The backend exposes three SSE streams (project readiness,
 * chat job phase + token chunks, integration health) — all share the same JSON-line wire format
 * and benefit from a common subscribe + auto-cleanup helper.
 *
 * Returns the underlying EventSource so callers can `.close()` it imperatively in addition to
 * using the `unsubscribe` callback for React effect teardown.
 */
export interface SseSubscription {
    /**
     * Kept for backwards compatibility with the previous native EventSource implementation.
     * Fetch-based SSE does not expose an EventSource instance.
     */
    eventSource?: EventSource;
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
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let unsubscribed = false;

    const dispatchData = (rawData: string) => {
        const data = rawData.trimEnd();
        if (!data) { return; }
        try {
            const parsed = JSON.parse(data) as T;
            handlers.onMessage(parsed);
        } catch {
            // Some backends emit raw strings — surface as-is rather than dropping.
            handlers.onMessage(data as unknown as T);
        }
    };

    const start = async () => {
        try {
            const accessToken = getAccessToken();
            const headers: Record<string, string> = {
                Accept: "text/event-stream",
            };
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const res = await fetch(url, {
                method: "GET",
                credentials: "include",
                headers,
                signal: abortController.signal,
            });

            if (!res.ok || !res.body) {
                handlers.onError?.(new Event("error"));
                return;
            }

            handlers.onOpen?.();

            const localReader = res.body.getReader();
            reader = localReader;
            const decoder = new TextDecoder();

            // Minimal SSE parser:
            // - events separated by a blank line
            // - payload is one or more `data:` lines, joined with `\n`
            let buffer = "";
            let dataLines: string[] = [];

            while (!abortController.signal.aborted) {
                const { value, done } = await localReader.read();
                if (done) { break; }

                buffer += decoder.decode(value, { stream: true });
                buffer = buffer.replace(/\r\n/g, "\n");

                let idx: number;
                while ((idx = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 1);

                    if (line === "") {
                        if (dataLines.length > 0) {
                            dispatchData(dataLines.join("\n"));
                            dataLines = [];
                        }
                        continue;
                    }

                    if (line.startsWith("data:")) {
                        dataLines.push(line.slice("data:".length).trimStart());
                    }
                }
            }
        } catch {
            // Abort should be a silent teardown.
            if (!abortController.signal.aborted) {
                handlers.onError?.(new Event("error"));
            }
        } finally {
            try { await reader?.cancel(); } catch { /* ignore */ }
            reader = null;
        }
    };

    // Fire and forget; callers control via unsubscribe.
    void start();

    const unsubscribe = () => {
        if (unsubscribed) { return; }
        unsubscribed = true;
        abortController.abort();
        // reader.cancel() is handled in finally.
    };

    return { unsubscribe };
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