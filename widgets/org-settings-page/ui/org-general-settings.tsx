"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrgByIdentifier, useUpdateOrg } from "@/shared/queries/org.queries";

export function OrgGeneralSettings() {
    const { organizationId } = useParams<{ organizationId: string }>();
    // URL identifier may be a slug (post-migration) or a UUID (legacy
    // bookmarks). useOrgByIdentifier picks the right backend endpoint.
    const { data, isLoading } = useOrgByIdentifier(organizationId);
    const org = data?.organization;
    const updateMutation = useUpdateOrg(organizationId);

    const [name, setName] = React.useState("");
    React.useEffect(() => {
        if (org?.name) setName(org.name);
    }, [org?.name]);

    const dirty = !!org && name.trim() !== "" && name !== org.name;

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dirty) return;
        try {
            await updateMutation.mutateAsync({ name: name.trim() });
            toast.success("Organization updated");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Update failed";
            toast.error("Couldn't update organization", { description: message });
        }
    };

    if (isLoading || !org) {
        return (
            <Card className="p-12 flex justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    return (
        <Card className="p-6 space-y-5">
            <div>
                <h2 className="text-base font-semibold">General</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Basic identity for this organization. The slug is generated when the org is
                    created and currently can&apos;t be edited from the UI.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                    <Label htmlFor="org-name">Organization name</Label>
                    <Input
                        id="org-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Acme Inc."
                        maxLength={120}
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Visible across the app and in member invitations.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input value={org.slug ?? ""} readOnly disabled className="font-mono" />
                    <p className="text-[11px] text-muted-foreground">
                        Used in URLs. Read-only — contact support to rename.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Organization ID</Label>
                    <Input value={org.id} readOnly disabled className="font-mono text-xs" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <Button type="submit" disabled={!dirty || updateMutation.isPending}>
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="size-4 mr-1.5 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="size-4 mr-1.5" />
                                Save changes
                            </>
                        )}
                    </Button>
                    {dirty ? (
                        <Button type="button" variant="ghost" onClick={() => setName(org.name ?? "")}>
                            Discard
                        </Button>
                    ) : null}
                </div>
            </form>
        </Card>
    );
}
