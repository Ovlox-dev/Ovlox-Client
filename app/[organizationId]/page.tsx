"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useOrganizationAccess } from "@/entities/organization/model/useOrganizationAccess";

export default function FranchiseeRootPage() {
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <p className="text-muted-foreground">Welcome</p>
      <Link href={`/${encodeURIComponent(organizationId)}/dashboard`}>
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
