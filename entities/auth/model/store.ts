import { create } from "zustand";
import { AxiosError } from "axios";
import type { AuthResponse, SignInRequest, SignUpRequest, VerifyOtpRequest } from "@/types/api-types";
import type { IUser } from "@/types/prisma-generated";
import { fetchCurrentUser, logout, refreshToken, requestOtp, signIn, signUp, verifyOtp } from "@/shared/api/auth";
import { setSessionUserId } from "@/shared/lib/auth/session-storage";
import { clearClientSessionState, getAccessToken, setAccessToken } from "@/shared/lib/auth/token-service";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthSlice = {
    user: IUser | null;
    isLoading: boolean;
    authStatus: AuthStatus;
    login: (payload: SignInRequest) => Promise<IUser>;
    signUp: (payload: SignUpRequest) => Promise<IUser>;
    logout: () => Promise<void>;
    verifyOtp: (payload: VerifyOtpRequest) => Promise<IUser>;
    requestOtp: (payload: { email?: string; phoneNumber?: string }) => Promise<IUser>;
    fetchUser: () => Promise<IUser | null>;
    bootstrapSession: () => Promise<IUser | null>;
    handleRefreshToken: () => Promise<string | null>;
    clearAuthState: () => void;
};

type AuthStore = {
    auth: AuthSlice;
};

let bootstrapPromise: Promise<IUser | null> | null = null;

function applyAuthResponseToSession(response: AuthResponse): IUser {
    if (response.accessToken) {
        setAccessToken(response.accessToken, response.refreshToken);
    }
    setSessionUserId(response.user.id);
    return response.user;
}

function clearSession(): void {
    clearClientSessionState();
}

function isAuthFailure(error: unknown): boolean {
    if (!(error instanceof AxiosError)) return false;
    const status = error.response?.status;
    return status === 401 || status === 403;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    auth: {
        user: null,
        isLoading: false,
        authStatus: "idle",

        login: async (payload) => {
            set((state) => ({ auth: { ...state.auth, isLoading: true, authStatus: "loading" } }));
            try {
                const response = await signIn(payload);
                const user = applyAuthResponseToSession(response);
                set((state) => ({
                    auth: { ...state.auth, user, isLoading: false, authStatus: "authenticated" },
                }));
                return user;
            } catch (error) {
                set((state) => ({
                    auth: { ...state.auth, isLoading: false, authStatus: "unauthenticated", user: null },
                }));
                throw error;
            }
        },

        signUp: async (payload) => {
            set((state) => ({ auth: { ...state.auth, isLoading: true, authStatus: "loading" } }));
            try {
                const response = await signUp(payload);
                const user = applyAuthResponseToSession(response);
                set((state) => ({
                    auth: { ...state.auth, user, isLoading: false, authStatus: "authenticated" },
                }));
                return user;
            } catch (error) {
                set((state) => ({
                    auth: { ...state.auth, isLoading: false, authStatus: "unauthenticated", user: null },
                }));
                throw error;
            }
        },

        verifyOtp: async (payload) => {
            set((state) => ({ auth: { ...state.auth, isLoading: true, authStatus: "loading" } }));
            try {
                const response = await verifyOtp(payload);
                const user = applyAuthResponseToSession(response);
                set((state) => ({
                    auth: { ...state.auth, user, isLoading: false, authStatus: "authenticated" },
                }));
                return user;
            } catch (error) {
                set((state) => ({
                    auth: { ...state.auth, isLoading: false, authStatus: "unauthenticated", user: null },
                }));
                throw error;
            }
        },

        requestOtp: async (payload) => {
            set((state) => ({ auth: { ...state.auth, isLoading: true } }));
            try {
                const response = await requestOtp(payload);
                const user = applyAuthResponseToSession(response);
                set((state) => ({ auth: { ...state.auth, user, isLoading: false } }));
                return user;
            } catch (error) {
                set((state) => ({ auth: { ...state.auth, isLoading: false } }));
                throw error;
            }
        },

        logout: async () => {
            set((state) => ({ auth: { ...state.auth, isLoading: true } }));
            try {
                await logout();
            } finally {
                clearSession();
                set((state) => ({
                    auth: {
                        ...state.auth,
                        user: null,
                        isLoading: false,
                        authStatus: "unauthenticated",
                    },
                }));
            }
        },

        fetchUser: async () => {
            set((state) => ({ auth: { ...state.auth, isLoading: true, authStatus: "loading" } }));
            try {
                const user = await fetchCurrentUser();
                setSessionUserId(user.id);
                set((state) => ({
                    auth: {
                        ...state.auth,
                        user,
                        isLoading: false,
                        authStatus: "authenticated",
                    },
                }));
                return user;
            } catch (error) {
                const hasToken = Boolean(getAccessToken());
                const shouldClearAuthState = isAuthFailure(error) || !hasToken;

                if (shouldClearAuthState) {
                    set((state) => ({
                        auth: {
                            ...state.auth,
                            user: null,
                            isLoading: false,
                            authStatus: "unauthenticated",
                        },
                    }));
                    return null;
                }

                // Preserve session state on transient failures so retries can recover.
                set((state) => ({
                    auth: {
                        ...state.auth,
                        isLoading: false,
                        authStatus: state.auth.user ? "authenticated" : "idle",
                    },
                }));
                return null;
            }
        },

        bootstrapSession: async () => {
            if (bootstrapPromise) return bootstrapPromise;
            bootstrapPromise = (async () => {
                set((state) => ({ auth: { ...state.auth, isLoading: true, authStatus: "loading" } }));
                if (!getAccessToken()) {
                    set((state) => ({
                        auth: {
                            ...state.auth,
                            user: null,
                            isLoading: false,
                            authStatus: "unauthenticated",
                        },
                    }));
                    return null;
                }
                try {
                    return await get().auth.fetchUser();
                } catch {
                    set((state) => ({
                        auth: {
                            ...state.auth,
                            isLoading: false,
                            authStatus: state.auth.user ? "authenticated" : "idle",
                        },
                    }));
                    return null;
                }
            })().finally(() => {
                bootstrapPromise = null;
            });
            return bootstrapPromise;
        },

        handleRefreshToken: async () => {
            try {
                const response = await refreshToken();
                if (response.accessToken) {
                    setAccessToken(response.accessToken);
                }
                if (response.user?.id) {
                    setSessionUserId(response.user.id);
                    set((state) => ({
                        auth: { ...state.auth, user: response.user, authStatus: "authenticated" },
                    }));
                }
                return response.accessToken ?? null;
            } catch {
                clearSession();
                set((state) => ({
                    auth: {
                        ...state.auth,
                        user: null,
                        authStatus: "unauthenticated",
                    },
                }));
                return null;
            }
        },

        clearAuthState: () => {
            clearSession();
            set((state) => ({
                auth: {
                    ...state.auth,
                    user: null,
                    isLoading: false,
                    authStatus: "unauthenticated",
                },
            }));
        },
    },
}));
