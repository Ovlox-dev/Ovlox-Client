import { userOrgs } from "@/entities/organization/api/org";
import { ACTIVE_ORG_ID_STORAGE_KEY } from "../storage-keys";


export const DASHBOARD_NEW_ORGANIZATION_ROUTE = "/new-organization";

type ResolvePostAuthOrgRedirectResult = {
    redirectTo: string;
    activeOrgId: string | null;
};

function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Stores the URL-safe identifier for the user's currently-active organization.
 * Historically this stored a UUID; after the slug migration we store the slug
 * so it can be dropped straight into URL builders. The backend slug-resolver
 * middleware accepts either form, so old persisted UUIDs keep working until
 * the next post-auth refresh overwrites them with a slug.
 */
export function setActiveOrgId(activeOrgId: string | null | undefined): void {
    if (!canUseLocalStorage()) { return; }

    if (activeOrgId) {
        window.localStorage.setItem(ACTIVE_ORG_ID_STORAGE_KEY, activeOrgId);
        return;
    }

    window.localStorage.removeItem(ACTIVE_ORG_ID_STORAGE_KEY);
}

export function getActiveOrgId(): string | null {
    if (!canUseLocalStorage()) { return null; }
    return window.localStorage.getItem(ACTIVE_ORG_ID_STORAGE_KEY);
}

/**
 * `orgIdentifier` is whatever the user has — slug (preferred, post-migration)
 * or UUID (legacy bookmarks). Both work because the backend resolves slugs
 * server-side. We `encodeURIComponent` to be safe against unusual slug chars.
 */
export function buildDashboardOrgRoute(orgIdentifier: string): string {
    return `/${encodeURIComponent(orgIdentifier)}/dashboard`;
}

async function resolveActiveOrgContext(): Promise<ResolvePostAuthOrgRedirectResult> {
    try {
        const response = await userOrgs();
        const orgs = response.data ?? [];

        if (orgs.length === 0) {
            setActiveOrgId(null);
            return {
                redirectTo: DASHBOARD_NEW_ORGANIZATION_ROUTE,
                activeOrgId: null,
            };
        }

        // Prefer slug (URL-safe) over id. Match the persisted value against
        // either id OR slug so legacy UUIDs in localStorage still resolve.
        const stored = getActiveOrgId();
        const matched = stored
            ? orgs.find((o) => o.id === stored || o.slug === stored)
            : undefined;
        const chosen = matched ?? orgs[0];
        const chosenIdentifier = chosen.slug || chosen.id;
        setActiveOrgId(chosenIdentifier);

        return {
            redirectTo: buildDashboardOrgRoute(chosenIdentifier),
            activeOrgId: chosenIdentifier,
        };
    } catch {
        setActiveOrgId(null);
        return {
            redirectTo: DASHBOARD_NEW_ORGANIZATION_ROUTE,
            activeOrgId: null,
        };
    }
}

export async function resolvePostAuthOrgRedirect(): Promise<ResolvePostAuthOrgRedirectResult> {
    return resolveActiveOrgContext();
}

/**
 * Fetches the user's organizations and persists the active org identifier
 * without redirecting. Use on pages (e.g. new-organization) that need the
 * escape-hatch UI after login when `ovlox.activeOrgId` was cleared on logout.
 */
export async function syncActiveOrgId(): Promise<string | null> {
    const { activeOrgId } = await resolveActiveOrgContext();
    return activeOrgId;
}
