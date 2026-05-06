import { clearSessionStorage } from "./session-storage";
import { ACTIVE_ORG_ID_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../storage-keys";

export interface TokenData {
    accessToken: string;
    expiresAt: number;
    refreshToken?: string;
}

export interface DecodedToken {
    userId?: string;
    type?: string;
    iat?: number;
    exp: number;
}

type RefreshResponse = {
    accessToken?: string;
    data?: { accessToken?: string };
    message?: string;
};

const FALLBACK_TOKEN_TTL_MS = 15 * 60 * 1000;

function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseTokenData(raw: string | null): TokenData | null {
    if (!raw) { return null; }
    try {
        const parsed = JSON.parse(raw) as Partial<TokenData>;
        if (!parsed?.accessToken) { return null; }
        const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : Number.MAX_SAFE_INTEGER;
        const refreshToken =
            typeof parsed.refreshToken === "string" && parsed.refreshToken.length > 0 ? parsed.refreshToken : undefined;
        return { accessToken: parsed.accessToken, expiresAt, ...(refreshToken ? { refreshToken } : {}) };
    } catch {
        return null;
    }
}

class TokenService {
    private static instance: TokenService;
    private accessToken: string | null = null;
    private tokenData: TokenData | null = null;
    private refreshPromise: Promise<TokenData> | null = null;

    static getInstance(): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }

    private writeTokenData(next: TokenData): void {
        this.accessToken = next.accessToken;
        this.tokenData = next;
        if (!canUseLocalStorage()) { return; }
        const payload: Record<string, unknown> = {
            accessToken: next.accessToken,
            expiresAt: next.expiresAt,
        };
        if (next.refreshToken && next.refreshToken.length > 0) {
            payload.refreshToken = next.refreshToken;
        }
        window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
    }

    setTokens(accessToken: string, refreshToken?: string): void {
        let previous: TokenData | null = this.tokenData;
        if (!previous?.accessToken && canUseLocalStorage()) {
            previous = parseTokenData(window.localStorage.getItem(TOKEN_STORAGE_KEY));
        }
        const nextRefresh =
            refreshToken !== undefined && refreshToken.length > 0
                ? refreshToken
                : previous?.refreshToken;

        try {
            const expiresAt = this.decodeToken(accessToken).exp * 1000;
            this.writeTokenData({
                accessToken,
                expiresAt,
                ...(nextRefresh ? { refreshToken: nextRefresh } : {}),
            });
        } catch {
            this.writeTokenData({
                accessToken,
                expiresAt: Date.now() + FALLBACK_TOKEN_TTL_MS,
                ...(nextRefresh ? { refreshToken: nextRefresh } : {}),
            });
        }
    }

    getTokens(): TokenData | null {
        if (this.tokenData?.accessToken) { return this.tokenData; }
        if (!canUseLocalStorage()) { return null; }

        const fromTokenData = parseTokenData(window.localStorage.getItem(TOKEN_STORAGE_KEY));
        if (fromTokenData) {
            this.writeTokenData(fromTokenData);
            return fromTokenData;
        }

        const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) { return null; }
        const fallback: TokenData = { accessToken: token, expiresAt: Number.MAX_SAFE_INTEGER };
        this.writeTokenData(fallback);
        return fallback;
    }

    getAccessToken(): string | null {
        if (this.accessToken) { return this.accessToken; }
        const tokens = this.getTokens();
        if (!tokens?.accessToken) { return null; }
        this.accessToken = tokens.accessToken;
        return tokens.accessToken;
    }

    /** Composite refresh for Authorization fallback (not the access JWT). Persisted with access token when cross-origin cookies are unreliable. */
    getRefreshToken(): string | null {
        const tokens = this.getTokens();
        const value = tokens?.refreshToken;
        return value && value.length > 0 ? value : null;
    }

    isTokenExpired(): boolean {
        const tokens = this.getTokens();
        if (!tokens) { return true; }
        return Date.now() >= tokens.expiresAt - 60 * 1000;
    }

    decodeToken(token: string): DecodedToken {
        const parts = token.split(".");
        if (parts.length < 2) { throw new Error("Invalid token format"); }
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join("")
        );
        return JSON.parse(jsonPayload) as DecodedToken;
    }

    clearTokens(): void {
        this.accessToken = null;
        this.tokenData = null;
        if (!canUseLocalStorage()) { return; }
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    async refreshToken(): Promise<TokenData> {
        if (this.refreshPromise) { return this.refreshPromise; }
        this.refreshPromise = this.performRefresh();
        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async performRefresh(): Promise<TokenData> {
        const compositeRefresh = this.getRefreshToken();
        const headers: Record<string, string> = {};
        if (compositeRefresh) {
            headers.Authorization = `Bearer ${compositeRefresh}`;
        }

        const absoluteBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
        const baseUrl = typeof window === "undefined" ? `${absoluteBaseUrl}/api/v1` : "/api/v1";
        const response = await fetch(`${baseUrl}/auth/refresh-token`, {
            method: "GET",
            credentials: "include",
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
        if (!response.ok) { throw new Error("Token refresh failed"); }

        const data = (await response.json()) as RefreshResponse;
        const nextToken = data.accessToken ?? data.data?.accessToken;
        if (nextToken) {
            this.setTokens(nextToken);
            const tokens = this.getTokens();
            if (!tokens) { throw new Error("Token refresh failed"); }
            return tokens;
        }

        const existing = this.getTokens();
        if (existing) { return existing; }
        throw new Error("Token refresh failed");
    }
}

export const tokenService = TokenService.getInstance();
export default TokenService;

export function setAccessToken(token: string | null | undefined, compositeRefresh?: string): void {
    if (!token) {
        tokenService.clearTokens();
        return;
    }
    tokenService.setTokens(token, compositeRefresh);
}

export function getAccessToken(): string | null {
    return tokenService.getAccessToken();
}

export async function refreshAccessToken(): Promise<string | null> {
    try {
        const refreshed = await tokenService.refreshToken();
        return refreshed.accessToken;
    } catch {
        return null;
    }
}

export function clearClientSessionState(): void {
    tokenService.clearTokens();
    clearSessionStorage();
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        window.localStorage.removeItem(ACTIVE_ORG_ID_STORAGE_KEY);
    }
}
