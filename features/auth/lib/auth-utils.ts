import axios from "axios";
import { resolvePostLoginAuthNavigation } from "@/shared/lib/auth/auth-navigation";
import type { ApiError } from "@/types/api-types";

export function getSafePostAuthRedirectPath(fromParam: string | null | undefined): string {
    return resolvePostLoginAuthNavigation(fromParam, "/login-success");
}

export function formatAuthErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiError | { message?: unknown } | undefined;
        if (data && typeof data === "object" && "message" in data && data.message != null) {
            const m = data.message;
            return Array.isArray(m) ? m.join(", ") : String(m);
        }
        if (error.message) return error.message;
    }
    if (error instanceof Error) return error.message;
    return "Something went wrong. Please try again.";
}
