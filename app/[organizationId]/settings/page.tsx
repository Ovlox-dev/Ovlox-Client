import { redirect } from "next/navigation";

export default async function SettingsIndex({
    params,
}: {
    params: Promise<{ organizationId: string }>;
}) {
    const { organizationId } = await params;
    redirect(`/${organizationId}/settings/general`);
}
