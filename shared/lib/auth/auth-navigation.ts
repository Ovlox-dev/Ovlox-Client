import { DASHBOARD_NEW_ORGANIZATION_ROUTE } from "@/shared/lib/auth/post-auth-org-resolver";

const AUTH_NAV_STORAGE_KEY = "ovlox.auth.navigation";
const AUTH_NAV_TTL_MS = 30 * 60 * 1000;

const AUTH_ONLY_ROUTES = new Set(["/signin", "/signup", "/otp"]);

type StoredAuthNavigation = {
    path: string;
    expiresAt: number;
};

function canUseSessionStorage(): boolean {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isSafePath(path: string | null | undefined): path is string {
    if (!path) return false;
    if (!path.startsWith("/")) return false;
    if (path.startsWith("//")) return false;
    return true;
}

function isAuthRoute(path: string): boolean {
    const base = path.split("?")[0]?.split("#")[0] ?? path;
    return AUTH_ONLY_ROUTES.has(base);
}

export function buildSigninRedirectPath(): string {
    return "/signin";
}

export function setAuthNavigation(path: string | null | undefined): void {
    if (!canUseSessionStorage()) return;
    if (!isSafePath(path) || isAuthRoute(path)) return;

    const payload: StoredAuthNavigation = {
        path,
        expiresAt: Date.now() + AUTH_NAV_TTL_MS,
    };
    window.sessionStorage.setItem(AUTH_NAV_STORAGE_KEY, JSON.stringify(payload));
}

export function popAuthNavigation(): string | null {
    if (!canUseSessionStorage()) return null;

    const raw = window.sessionStorage.getItem(AUTH_NAV_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_NAV_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as StoredAuthNavigation;
        if (!isSafePath(parsed.path) || parsed.expiresAt < Date.now()) return null;
        if (isAuthRoute(parsed.path)) return null;
        return parsed.path;
    } catch {
        return null;
    }
}

export function resolvePostLoginAuthNavigation(
    fromPath: string | null | undefined,
    fallback?: string,
): string;
export function resolvePostLoginAuthNavigation(
    redirectURI: string | null | undefined,
    fromPath: string | null | undefined,
    fallback?: string,
): string;
export function resolvePostLoginAuthNavigation(
    arg1: string | null | undefined,
    arg2?: string | null,
    arg3?: string,
): string {
    const fallback = arg3 ?? (arg2 ?? DASHBOARD_NEW_ORGANIZATION_ROUTE);

    // New signature: (redirectURI, fromPath, fallback?)
    if (typeof arg3 !== "undefined") {
        const redirectURI = arg1;
        const fromPath = arg2;

        if (isSafePath(redirectURI) && !isAuthRoute(redirectURI)) {
            return redirectURI;
        }
        if (isSafePath(fromPath) && !isAuthRoute(fromPath)) {
            return fromPath;
        }
    } else {
        // Legacy signature: (fromPath, fallback?)
        const fromPath = arg1;
        if (isSafePath(fromPath) && !isAuthRoute(fromPath)) {
            return fromPath;
        }
    }

    const storedPath = popAuthNavigation();
    if (storedPath) return storedPath;
    return fallback;
}
