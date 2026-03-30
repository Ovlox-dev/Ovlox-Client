import * as React from "react";
import { useOrgStore } from "@/shared/lib/organization/org-store";
import { useRouter } from "next/navigation";
import { userOrgBySlug } from "@/shared/api/org";
import { IOrganization } from "@/types/prisma-generated";
import { buildDashboardOrgRoute, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver";

export const useOrg = () => {
    const { currentOrg, setCurrentOrg, clearCurrentOrg } = useOrgStore();
    const router = useRouter();

    const selectOrg = React.useCallback(async (org: IOrganization) => {
        setCurrentOrg(org);
        setActiveOrgId(org.id);
        router.push(buildDashboardOrgRoute(org.id));
    }, [router, setCurrentOrg]);

    const loadOrgBySlug = React.useCallback(async (slug: string) => {
        try {
            const { organization } = await userOrgBySlug(slug);
            setCurrentOrg(organization);
            setActiveOrgId(organization.id);
            return organization;
        } catch (error) {
            console.error("Failed to load organization", error);
            throw error;
        }
    }, [setCurrentOrg]);

    return {
        currentOrg,
        setCurrentOrg,
        selectOrg,
        loadOrgBySlug,
        clearCurrentOrg,
    };
};
