import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import {
    contributionsKeys,
    getContributionMap,
    type Contributor,
    useListProjects,
} from "@/entities/project";

export interface MemberStats {
    /** Distinct projects this member has contributed to */
    projectCount: number;
    /** Sum of commits + PRs + messages + tasks + other across every project */
    contributions: number;
}

/**
 * Aggregates per-member stats (projects involved, total contributions) across
 * every project in the org. The `listMembers` endpoint doesn't include these
 * counts, but the per-project `getContributionMap` endpoint returns
 * `Contributor[]` keyed by `memberId` — we fan-out one query per project and
 * fold the results.
 *
 * Returns a map keyed by member id. Members with no recorded contributions
 * simply won't appear in the map; consumers should fall back to 0.
 *
 * Heads-up: this fires N parallel requests (one per project). React Query
 * dedupes/caches, so revisiting the page is cheap. For very large orgs (50+
 * projects) consider asking the backend for an aggregated endpoint.
 */
export function useOrgMemberStats(organizationId: string): {
    stats: Record<string, MemberStats>;
    isLoading: boolean;
} {
    const { data: projectsResponse, isLoading: projectsLoading } = useListProjects(
        organizationId,
        { limit: 200 }
    );

    const projects = useMemo(
        () => projectsResponse?.data ?? [],
        [projectsResponse]
    );

    const contribQueries = useQueries({
        queries: projects.map((p) => ({
            queryKey: contributionsKeys.project(organizationId, p.id),
            queryFn: () => getContributionMap(organizationId, p.id),
            enabled: !!organizationId && !!p.id,
            staleTime: 60_000,
        })),
    });

    const stats = useMemo(() => {
        const acc: Record<string, MemberStats> = {};
        contribQueries.forEach((query, idx) => {
            const project = projects[idx];
            if (!project || !query.data) return;

            for (const c of query.data.contributors as Contributor[]) {
                if (!c.memberId) continue;

                if (!acc[c.memberId]) {
                    acc[c.memberId] = { projectCount: 0, contributions: 0 };
                }

                // Each contributor row already represents this member on this project,
                // so we increment projectCount once per (memberId × projectId) pair.
                acc[c.memberId].projectCount += 1;
                acc[c.memberId].contributions +=
                    (c.commits ?? 0) +
                    (c.pullRequests ?? 0) +
                    (c.messages ?? 0) +
                    (c.tasks ?? 0) +
                    (c.other ?? 0);
            }
        });
        return acc;
    }, [contribQueries, projects]);

    const isLoading =
        projectsLoading || contribQueries.some((q) => q.isLoading);

    return { stats, isLoading };
}
