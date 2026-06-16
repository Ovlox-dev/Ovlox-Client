import type { AxiosResponse } from "axios";
import type { AuthResponse, RequestOtpRequest, SignInRequest, SignUpRequest, VerifyOtpRequest } from "@/types/api-types";
import type { IUser } from "@/types/prisma-generated";
import { apiClient, refreshClient } from "./client";
import { normalizeAuthPayload } from "@/shared/lib/auth/payloads";

export async function signIn(payload: SignInRequest): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/sign-in", payload);
    return normalizeAuthPayload(response.data);
}

/**
 * Hand a Firebase ID token to the backend; the backend verifies it via the
 * Admin SDK and returns *our* access/refresh token pair plus the user.
 * Firebase tokens are not stored client-side past this single call.
 */
export async function signInGoogle(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/google", { idToken });
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

/** Request a password-reset code (emailed). Returns generic success even for unknown accounts. */
export async function forgotPassword(payload: { email?: string; phoneNumber?: string }): Promise<void> {
    await apiClient.post("/auth/forgot-password", payload);
}

/** Complete a password reset with the emailed code. */
export async function resetPassword(payload: {
    email?: string;
    phoneNumber?: string;
    otpString: string;
    password: string;
}): Promise<void> {
    await apiClient.post("/auth/reset-password", payload);
}

/** Set or change the signed-in user's password (currentPassword required only if one already exists). */
export async function setPassword(payload: { currentPassword?: string; newPassword: string }): Promise<void> {
    await apiClient.post("/auth/set-password", payload);
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
        if (record.user && typeof record.user === "object") { return record.user as IUser; }
        if (record.data && typeof record.data === "object") {
            const nested = record.data as Record<string, unknown>;
            if (nested.user && typeof nested.user === "object") { return nested.user as IUser; }
            return nested as unknown as IUser;
        }
    }

    return data as IUser;
}
