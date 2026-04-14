import { userOrgs } from "@/shared/api/org";
import { ACTIVE_ORG_ID_STORAGE_KEY } from "../storage-keys";


export const DASHBOARD_NEW_ORGANIZATION_ROUTE = "/new-organization";

type ResolvePostAuthOrgRedirectResult = {
    redirectTo: string;
    activeOrgId: string | null;
};

function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

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

export function buildDashboardOrgRoute(orgId: string): string {
    return `/${encodeURIComponent(orgId)}/dashboard`;
}

export async function resolvePostAuthOrgRedirect(): Promise<ResolvePostAuthOrgRedirectResult> {
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

        const ids = orgs.map((o) => o.id);
        const stored = getActiveOrgId();
        const chosen =
            stored && ids.includes(stored) ? stored : orgs[0].id;
        setActiveOrgId(chosen);

        return {
            redirectTo: buildDashboardOrgRoute(chosen),
            activeOrgId: chosen,
        };
    } catch {
        setActiveOrgId(null);
        return {
            redirectTo: DASHBOARD_NEW_ORGANIZATION_ROUTE,
            activeOrgId: null,
        };
    }
}
