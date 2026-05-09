import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearClientSessionState, getAccessToken } from "@/shared/lib/auth/token-service";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * In the browser, hit /api/v1/* on this origin. Next.js rewrites (next.config.ts) forward the
 * request server-to-server to NEXT_PUBLIC_API_URL — this keeps HttpOnly cookies same-origin so
 * SameSite=Lax cookies attach correctly. The browser sees localhost:3000/api/v1 in the URL bar;
 * the actual upstream call to api.ovlox.dev happens server-side.
 *
 * On the server (SSR / route handlers), use the absolute upstream URL directly since there's
 * no Next rewrite layer running there.
 */
const absoluteApiBaseUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;
const browserApiBaseUrl = "/api/v1";

export const apiBaseUrl = typeof window === "undefined" ? absoluteApiBaseUrl : browserApiBaseUrl;

/**
 * Absolute backend URL for streaming endpoints (SSE) and any other path that
 * must bypass Next.js's `rewrites()` proxy. Vercel and most CDNs buffer
 * non-streaming responses by default, which silently breaks SSE — chunks
 * never reach the browser. Sockets already bypass via [lib/socket.ts] for
 * the same reason.
 *
 * Auth: streaming endpoints can't rely on HttpOnly cookies (cross-origin without
 * SameSite=None+Secure won't attach), so callers MUST pass the bearer token
 * explicitly via Authorization header.
 */
export const apiAbsoluteUrl = absoluteApiBaseUrl;

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

export const refreshClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

let isRefreshing = false;
let hasClearedSessionAfterRefreshFailure = false;
const failedQueue: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown | null): void {
    while (failedQueue.length) {
        const queued = failedQueue.shift();
        if (!queued) { continue; }
        if (error) { queued.reject(error); }
        else { queued.resolve(); }
    }
}

async function attemptRefreshToken(): Promise<void> {
    // Cookie-based refresh: backend rotates HttpOnly cookies.
    await refreshClient.get("/auth/refresh-token");
}

function clearSessionAfterRefreshFailure(): void {
    if (hasClearedSessionAfterRefreshFailure) { return; }
    clearClientSessionState();
    hasClearedSessionAfterRefreshFailure = true;
}

apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        if (!originalRequest) { return Promise.reject(error); }

        const status = error.response?.status;

        if (status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: () => {
                        originalRequest._retry = true;
                        resolve(apiClient(originalRequest));
                    },
                    reject,
                });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await attemptRefreshToken();
            hasClearedSessionAfterRefreshFailure = false;
            processQueue(null);
            return apiClient(originalRequest);
        } catch (refreshError) {
            clearSessionAfterRefreshFailure();
            processQueue(refreshError);
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
