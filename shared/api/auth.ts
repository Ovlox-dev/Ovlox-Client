import type { AxiosResponse } from "axios";
import type { AuthResponse, RequestOtpRequest, SignInRequest, SignUpRequest, VerifyOtpRequest } from "@/types/api-types";
import type { IUser } from "@/types/prisma-generated";
import { apiClient, refreshClient } from "./client";
import { normalizeAuthPayload } from "@/shared/lib/auth/payloads";

export async function signIn(payload: SignInRequest): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/sign-in", payload);
    return normalizeAuthPayload(response.data);
}

/** Sign-up succeeds without establishing a client session; tokens in the response body are ignored. */
export async function signUp(payload: SignUpRequest): Promise<void> {
    await apiClient.post("/auth/sign-up", payload);
}

export async function verifyOtp(payload: VerifyOtpRequest): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/verify-otp", payload);
    return normalizeAuthPayload(response.data);
}

export async function requestOtp(payload: RequestOtpRequest): Promise<void> {
    await apiClient.post("/auth/request-otp", payload);
}

export async function logout(): Promise<void> {
    await apiClient.put("/auth/logout");
}

export async function refreshToken(): Promise<AuthResponse> {
    const response = await refreshClient.get("/auth/refresh-token");
    return normalizeAuthPayload(response.data);
}

export async function fetchCurrentUser(): Promise<IUser> {
    const response: AxiosResponse<IUser | { user: IUser } | { data: IUser } | { data: { user: IUser } }> =
        await apiClient.get("/user/me");
    const data = response.data as unknown;

    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (record.user && typeof record.user === "object") return record.user as IUser;
        if (record.data && typeof record.data === "object") {
            const nested = record.data as Record<string, unknown>;
            if (nested.user && typeof nested.user === "object") return nested.user as IUser;
            return nested as unknown as IUser;
        }
    }

    return data as IUser;
}
