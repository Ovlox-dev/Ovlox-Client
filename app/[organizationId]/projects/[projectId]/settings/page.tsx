import { redirect } from "next/navigation";

export default async function Page({
    params,
}: {
    params: Promise<{ organizationId: string; projectId: string }>;
}) {
    const { organizationId, projectId } = await params;
    redirect(`/${organizationId}/projects/${projectId}/settings/branches`);
}
