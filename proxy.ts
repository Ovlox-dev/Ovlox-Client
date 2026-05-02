import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-fast cookie existence check. Does NOT validate the JWT — that's the backend's job.
 * Goal: short-circuit unauthenticated requests to protected routes server-side, eliminating
 * the first-paint flash where the client renders briefly before bootstrapSession redirects.
 *
 * Cookies are set by the backend (auth.service.ts → res.cookie('accessToken'/'refreshToken'))
 * and forwarded through the Next.js rewrite proxy (next.config.ts), so they live on the
 * frontend origin. A user is "session-present" if either cookie exists — refreshToken is the
 * source of truth for "logged-in", since accessToken expires after 15 min.
 */

const PUBLIC_ROUTES = new Set<string>([
    "/signin",
    "/signup",
    "/otp",
    "/verify-email",
    "/login-success",
]);

const PUBLIC_PREFIXES = ["/invites"];

function isPublicRoute(pathname: string): boolean {
    if (PUBLIC_ROUTES.has(pathname)) { return true; }
    return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    const hasSession =
        req.cookies.has("accessToken") || req.cookies.has("refreshToken");

    if (!hasSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/signin";
        url.search = "";
        url.searchParams.set("redirectURI", `${pathname}${search}`);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)"],
};
