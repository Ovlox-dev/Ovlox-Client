"use client";

import { useEffect } from "react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Decode an axios error into a stable, UI-friendly shape and surface it via toast.
 *
 * Centralises the handling of well-known status codes so widgets don't each reinvent the wheel:
 *   - 401 → redirect to /signin (token expired or user logged out)
 *   - 403 → "you don't have permission" toast
 *   - 425 → "Project context isn't ready yet — connect an integration to start indexing"
 *   - 429 → "rate limited" toast
 *   - 5xx → generic "something went wrong" toast
 *
 * Returns a normalised { status, message } so the caller can also render an inline ErrorState.
 */
export interface ApiErrorInfo {
    status: number | null;
    message: string;
    code?: string | null;
}

/**
 * Coerce ANY value into a render-safe string. The backend's NestJS exception filter usually returns
 * `{ statusCode, message, error }` where `message` is a string OR a string[] OR a list of validation
 * objects. Older callsites passed the whole envelope into a toast, which caused a React 19 crash
 * ("Objects are not valid as a React child") because Sonner queued an object as the toast title.
 *
 * Anything goes in, a string comes out. Falls back to JSON for unknown plain objects, capped to keep
 * a runaway payload from blowing up the toast UI.
 */
function toMessage(value: unknown): string {
    if (typeof value === "string") { return value; }
    if (value === null || value === undefined) { return ""; }
    if (typeof value === "number" || typeof value === "boolean") { return String(value); }
    if (Array.isArray(value)) {
        return value.map((v) => toMessage(v)).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (typeof obj.message === "string") { return obj.message; }
        if (Array.isArray(obj.message)) { return toMessage(obj.message); }
        if (typeof obj.error === "string") { return obj.error; }
        try {
            const json = JSON.stringify(value);
            return json.length > 200 ? `${json.slice(0, 200)}…` : json;
        } catch {
            return "Unexpected error";
        }
    }
    return String(value);
}

export function decodeApiError(error: unknown): ApiErrorInfo {
    if (isAxiosError(error)) {
        const status = error.response?.status ?? null;
        const data = error.response?.data as
            | { message?: unknown; error?: unknown; code?: string }
            | undefined;
        const fromData =
            toMessage(data?.message) ||
            toMessage(data?.error);
        const fromError = toMessage(error.message);
        const message = fromData || fromError || "Request failed";
        return { status, message, code: data?.code ?? null };
    }
    if (error instanceof Error) {
        return { status: null, message: toMessage(error.message) || "Unexpected error" };
    }
    return { status: null, message: toMessage(error) || "Unexpected error" };
}

export function useApiError(error: unknown, options: { silentStatuses?: number[] } = {}) {
    const router = useRouter();
    const silent = new Set(options.silentStatuses ?? []);

    useEffect(() => {
        if (!error) { return; }
        const info = decodeApiError(error);

        if (info.status && silent.has(info.status)) { return; }

        switch (info.status) {
            case 401:
                toast.error("Your session has expired. Please sign in again.");
                router.replace("/signin");
                break;
            case 403:
                toast.error("You don't have permission to do that", { description: info.message });
                break;
            case 425:
                toast.warning("Project context isn't ready yet", {
                    description: "Link an integration with resources to start indexing.",
                });
                break;
            case 429:
                toast.error("Too many requests — please slow down");
                break;
            default:
                if (info.status && info.status >= 500) {
                    toast.error("Something went wrong on our end", { description: info.message });
                } else if (info.status) {
                    toast.error(info.message);
                } else { toast.error(info.message || "Network error"); }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    return decodeApiError(error);
}
