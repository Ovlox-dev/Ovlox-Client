import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearClientSessionState, getAccessToken, refreshAccessToken } from "@/shared/lib/auth/token-service";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function normalizeApiBaseUrl(rawBaseUrl: string): string {
    return rawBaseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

/** Includes `/api/v1` — Nest global prefix (see Ovlox-Services `main.ts`). */
export const apiBaseUrl = `${normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")}/api/v1`;

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
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
    while (failedQueue.length) {
        const queued = failedQueue.shift();
        if (!queued) continue;
        if (error) queued.reject(error);
        else queued.resolve(token);
    }
}

async function attemptRefreshToken(): Promise<string | null> {
    return refreshAccessToken();
}

function createRefreshFailureError(): Error {
    return new Error("Access token refresh did not return a valid token");
}

function clearSessionAfterRefreshFailure(): void {
    if (hasClearedSessionAfterRefreshFailure) return;
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
        if (!originalRequest) return Promise.reject(error);

        const status = error.response?.status;
   
        if (status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (token) => {
                        if (!token) {
                            reject(createRefreshFailureError());
                            return;
                        }
                        originalRequest._retry = true;
                        // originalRequest.headers = originalRequest.headers ?? {};
                        // originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(apiClient(originalRequest));
                    },
                    reject,
                });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const newAccessToken = await attemptRefreshToken();
            if (!newAccessToken) {
                const refreshFailure = createRefreshFailureError();
                clearSessionAfterRefreshFailure();
                processQueue(refreshFailure, null);
                return Promise.reject(refreshFailure);
            }

            hasClearedSessionAfterRefreshFailure = false;
            processQueue(null, newAccessToken);
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            clearSessionAfterRefreshFailure();
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
