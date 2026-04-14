"use client";

import { useParams } from "next/navigation";
import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess";

import AppsConnected from "./components/apps-connected";
import Members from "./components/members";
import Projects from "./components/projects";
import TeamActivity from "./components/team-activity";

export default function FranchiseeDashboardPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params?.organizationId ?? "";
    const hasAccess = useOrganizationAccess(organizationId);

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
