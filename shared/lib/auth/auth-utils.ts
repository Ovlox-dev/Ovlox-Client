import axios from "axios";
import { resolvePostLoginAuthNavigation } from "@/shared/lib/auth/auth-navigation";
import type { ApiError } from "@/types/api-types";

export function getSafePostAuthRedirectPath(fromParam: string | null | undefined): string {
    return resolvePostLoginAuthNavigation(fromParam, "/login-success");
}

export function formatAuthErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | ApiError
            | { message?: unknown; error?: unknown }
            | { error?: { message?: unknown } }
            | undefined;

        if (data && typeof data === "object") {
            if ("message" in data && (data as { message?: unknown }).message !== null && (data as { message?: unknown }).message !== undefined) {
                const m = (data as { message: unknown }).message;
                return Array.isArray(m) ? m.join(", ") : String(m);
            }

            // Some endpoints wrap the error payload as { error: { message, ... }, ... }
            if ("error" in data && (data as { error?: unknown }).error && typeof (data as { error: unknown }).error === "object") {
                const nested = (data as { error: { message?: unknown } }).error.message;
                if (nested !== null && nested !== undefined) {
                    return Array.isArray(nested) ? nested.join(", ") : String(nested);
                }
            }
        }
        if (error.message) { return error.message; }
    }
    if (error instanceof Error) { return error.message; }
    return "Something went wrong. Please try again.";
}
