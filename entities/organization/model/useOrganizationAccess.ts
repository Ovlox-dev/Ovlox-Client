"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { userOrgs } from "@/shared/api/org";
import { resolvePostAuthOrgRedirect } from "@/shared/lib/auth/post-auth-org-resolver";

export function useOrganizationAccess(organizationId: string | undefined): boolean {
  const router = useRouter();
  const [verifiedOrgId, setVerifiedOrgId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await setVerifiedOrgId(null);
    })();

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
        if (orgs.some((o) => o.id === id)) {
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
