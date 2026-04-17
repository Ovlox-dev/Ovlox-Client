import type { UserRole } from "@/types/enum";

type RouteAccessPolicy = {
    pattern: RegExp;
    requiresAuth: boolean;
    roles?: UserRole[];
    redirectIfAuthenticated?: boolean;
};

const DEFAULT_PROTECTED_POLICY: RouteAccessPolicy = {
    pattern: /^.*$/,
    requiresAuth: true,
};

const policies: RouteAccessPolicy[] = [
    { pattern: /^\/signin(?:\/|$)/, requiresAuth: false, redirectIfAuthenticated: true },
    { pattern: /^\/signup(?:\/|$)/, requiresAuth: false, redirectIfAuthenticated: true },
    { pattern: /^\/otp(?:\/|$)/, requiresAuth: false, redirectIfAuthenticated: true },
    { pattern: /^\/invite(?:\/|$)/, requiresAuth: false },
];

export function getRouteAccessPolicy(pathname: string | null | undefined): RouteAccessPolicy {
    if (!pathname) { return DEFAULT_PROTECTED_POLICY; }
    return policies.find((policy) => policy.pattern.test(pathname)) ?? DEFAULT_PROTECTED_POLICY;
}

export function canAccessRoute(pathname: string | null | undefined, role: UserRole | null | undefined): boolean {
    const policy = getRouteAccessPolicy(pathname);
    if (!policy.roles?.length) { return true; }
    if (!role) { return false; }
    return policy.roles.includes(role);
}
