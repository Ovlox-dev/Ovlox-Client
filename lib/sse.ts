import { apiAbsoluteUrl } from "@/shared/api/client";
import { getAccessToken, refreshAccessToken } from "@/shared/lib/auth/token-service";

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

    /**
     * Open the SSE fetch with the current bearer. If the token has expired
     * the backend returns 401; we try ONE refresh + retry before giving up.
     *
     * Why this exists: axios consumers (`apiClient`) get auto-refresh via the
     * 401 response interceptor in `shared/api/client.ts`. The fetch-based SSE
     * path bypasses axios entirely (it has to — we need streaming bodies),
     * so it has to do its own refresh. Without this, an SSE connection
     * opened ~15 minutes after sign-in silently fails when the access token
     * lapses, and chat streams die with no explanation in the UI.
     */
    const fetchWithAuth = async (token: string | null) => {
        const headers: Record<string, string> = {
            Accept: "text/event-stream",
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return fetch(url, {
            method: "GET",
            credentials: "include",
            headers,
            signal: abortController.signal,
        });
    };

    const start = async () => {
        try {
            let accessToken = getAccessToken();
            let res = await fetchWithAuth(accessToken);

            // 401 → token expired (or never sent). Refresh once and retry.
            // We don't loop on repeated 401s — if the refresh itself fails
            // or the second attempt also 401s, the user is genuinely signed
            // out and the SSE has no business continuing.
            //
            // `refreshAccessToken()` distinguishes its return values precisely:
            //   - null         → refresh threw (HTTP failed, network error, etc.) → genuine session loss
            //   - "" (empty)   → refresh HTTP succeeded but body carried no Bearer token. That's the
            //                    cookie-only auth mode the backend currently uses — rotated cookies are
            //                    fresh, we just have no Authorization header value. Retry with cookies.
            //   - non-empty    → new Bearer token to use on the retry.
            // Treating `!refreshed` (which is true for both null AND "") as failure was the bug:
            // a perfectly-good cookie refresh produced "" and the SSE bailed with "session expired".
            if (res.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed === null) {
                    handlers.onError?.(new Event("error"));
                    return;
                }
                accessToken = refreshed;
                res = await fetchWithAuth(accessToken);
            }

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

/** Live code-indexing progress, published to the same readiness channel (carries no contextReadiness). */
export type ReadinessActivity = {
    state: "running" | "done" | "error";
    phase?: string;
    repo?: string;
    file?: string;
    current?: number;
    total?: number;
    message?: string;
};

export type ReadinessActivityEvent = {
    projectId: string;
    source?: string;
    activity: ReadinessActivity;
};

/** The readiness stream carries either a full snapshot or a live activity event. */
export type ReadinessEvent = ReadinessSnapshot | ReadinessActivityEvent;

/**
 * Subscribe to /projects/:id/readiness/stream. The backend publishes a snapshot on connect + one per
 * BackfillProcessor completion, plus live code-indexing activity events (which carry `activity`
 * instead of `contextReadiness`). Consumers narrow with `"contextReadiness" in event`.
 */
export function streamProjectReadiness(
    orgId: string,
    projectId: string,
    onEvent: (event: ReadinessEvent) => void,
    onError?: (error: Event) => void,
): SseSubscription {
    const url = `${apiAbsoluteUrl}/orgs/${orgId}/projects/${projectId}/readiness/stream`;
    return createEventSource<ReadinessEvent>(url, { onMessage: onEvent, onError });
}

export interface AgentStepEvent {
    id: string;
    label: string;
    detail?: string;
    status: "running" | "done";
}

export type JobStatusEvent =
    | { jobId: string; status?: string; attempts?: number; payload?: unknown; updatedAt?: string; completed?: boolean; userId?: string; error?: string }
    | { jobId: string; userId?: string; kind: "chunk"; seq: number; delta: string }
    | { jobId: string; userId?: string; kind: "stage"; seq: number; stage: string; detail?: string }
    | ({ jobId: string; userId?: string; kind: "step"; seq: number } & AgentStepEvent)
    | { jobId: string; userId?: string; kind: "answer"; answer: string; chatMessageId?: string; steps?: AgentStepEvent[]; partialContext?: boolean };

/**
 * Subscribe to /chat/jobs/:jobId/stream. Mirrors the WebSocket `chatChunk`/`newMessage` events
 * for environments where WebSocket is unavailable.
 */
export function streamJobStatus(
    jobId: string,
    onEvent: (event: JobStatusEvent) => void,
    onError?: (error: Event) => void,
): SseSubscription {
    const url = `${apiAbsoluteUrl}/chat/jobs/${jobId}/stream`;
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
    const url = `${apiAbsoluteUrl}/orgs/integrations/status/${orgSlug}`;
    return createEventSource(url, { onMessage: onSnapshot, onError });
}