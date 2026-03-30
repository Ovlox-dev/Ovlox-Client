"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { userOrgs } from "@/shared/api/org";
import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess";

import type { IOrganization } from "@/types/prisma-generated";

import AppsConnected from "./components/apps-connected";
import Members from "./components/members";
import Projects from "./components/projects";
import TeamActivity from "./components/team-activity";





export default function FranchiseeDashboardPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? "";
    const hasAccess = useOrganizationAccess(organizationId);
    const [userOrgsList, setUserOrgsList] = useState<IOrganization[]>([]);

    useEffect(() => {
        if (!hasAccess) return;
        let cancelled = false;
        void (async () => {
            try {
                const response = await userOrgs();
                if (!cancelled) setUserOrgsList(response.data ?? []);
            } catch {
                if (!cancelled) setUserOrgsList([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [hasAccess]);

    if (!hasAccess) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-muted-foreground">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top row: Apps Connected, Members, Active Projects */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Apps Connected */}
                <AppsConnected />
                {/* Members */}
                <Members />
                {/* Active Projects */}
                <Projects />
            </div>

            {/* Team Activity */}
            <TeamActivity />
        </div>
    );
}
