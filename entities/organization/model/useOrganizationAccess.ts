"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { userOrgs } from "@/entities/organization/api/org";
import { resolvePostAuthOrgRedirect } from "@/shared/lib/auth/post-auth-org-resolver";

export function useOrganizationAccess(organizationId: string | undefined): boolean {
  const router = useRouter();
  const [verifiedOrgId, setVerifiedOrgId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // No need to reset verifiedOrgId here: the hook returns `verifiedOrgId === current`, which is
    // already false whenever the previously-verified org differs from the current URL org, so a stale
    // value can never grant access to a different org while verify() re-runs.

    async function verify() {
      const id = organizationId?.trim();
      if (!id) {
        try {
          const { redirectTo } = await resolvePostAuthOrgRedirect();
          if (!cancelled) {
            router.replace(redirectTo);
          }
        } catch {
          if (!cancelled) {
            router.replace("/signin");
          }
        }
        return;
      }

      try {
        const response = await userOrgs();
        if (cancelled) { return; }
        const orgs = response.data ?? [];
        // URL identifier may be a slug (post-migration) OR a UUID (legacy
        // bookmarks / localStorage). Both forms grant access.
        if (orgs.some((o) => o.id === id || o.slug === id)) {
          if (!cancelled) {
            setVerifiedOrgId(id);
          }
          return;
        }
        const { redirectTo } = await resolvePostAuthOrgRedirect();
        if (!cancelled) {
          router.replace(redirectTo);
        }
      } catch (e) {
        if (cancelled) { return; }
        if (isAxiosError(e) && e.response?.status === 401) {
          if (!cancelled) {
            router.replace("/signin");
          }
          return;
        }
        try {
          const { redirectTo } = await resolvePostAuthOrgRedirect();
          if (!cancelled) {
            router.replace(redirectTo);
          }
        } catch {
          if (!cancelled) {
            router.replace("/signin");
          }
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [organizationId, router]);

  const current = organizationId?.trim() ?? "";
  return current !== "" && verifiedOrgId === current;
}
