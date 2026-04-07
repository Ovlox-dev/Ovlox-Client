import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearClientSessionState, getAccessToken } from "@/shared/lib/auth/token-service";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const absoluteApiBaseUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;
export const apiBaseUrl = typeof window === "undefined" ? absoluteApiBaseUrl : "/api/v1";

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
        if (!queued) continue;
        if (error) queued.reject(error);
        else queued.resolve();
    }
}

async function attemptRefreshToken(): Promise<void> {
    // Cookie-based refresh: backend rotates HttpOnly cookies.
    await refreshClient.get("/auth/refresh-token");
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
