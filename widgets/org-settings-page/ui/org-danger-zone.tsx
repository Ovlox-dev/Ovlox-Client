"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal";
import { useOrgByIdentifier, useDeleteOrg } from "@/shared/queries/org.queries";
import { useOrgStore } from "@/shared/lib/organization/org-store";

export function OrgDangerZone() {
    const router = useRouter();
    const { organizationId } = useParams<{ organizationId: string }>();
    // URL may be slug or UUID — useOrgByIdentifier handles both.
    const { data } = useOrgByIdentifier(organizationId);
    const org = data?.organization;
    const deleteMutation = useDeleteOrg();
    const clearCurrentOrg = useOrgStore((s) => s.clearCurrentOrg);

    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmName, setConfirmName] = React.useState("");
    const namesMatch = !!org && confirmName.trim() === org.name;

    const onDelete = async () => {
        if (!org || !namesMatch) return;
        try {
            await deleteMutation.mutateAsync(org.id);
            clearCurrentOrg();
            toast.success(`${org.name} deleted`);
            router.push("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Delete failed";
            toast.error("Couldn't delete organization", { description: message });
        }
    };

    return (
        <Card className="p-6 border-destructive/40 space-y-5">
            <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-5 text-destructive" />
                </div>
                <div className="flex-1">
                    <h2 className="text-base font-semibold">Danger zone</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Destructive operations that cannot be undone.
                    </p>
                </div>
            </div>

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="text-sm font-semibold">Delete this organization</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-prose">
                            Permanently removes the organization, all of its projects, integrations,
                            connected data, and member access. This action cannot be reversed.
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            setConfirmName("");
                            setConfirmOpen(true);
                        }}
                    >
                        <Trash2 className="size-4 mr-1.5" />
                        Delete organization
                    </Button>
                </div>
            </div>

            <CustomModal open={confirmOpen} onOpenChange={setConfirmOpen}>
                <CustomModalHeader>
                    <CustomModalTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="size-4" />
                        Delete {org?.name ?? "organization"}?
                    </CustomModalTitle>
                    <CustomModalDescription>
                        This will permanently delete the organization, all projects, integrations,
                        and ingested data. There is no undo.
                    </CustomModalDescription>
                </CustomModalHeader>
                <CustomModalBody className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="confirm-name" className="text-xs">
                            Type <span className="font-mono font-semibold">{org?.name}</span> to confirm
                        </Label>
                        <Input
                            id="confirm-name"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            autoComplete="off"
                            placeholder={org?.name}
                        />
                    </div>
                </CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onDelete}
                        disabled={!namesMatch || deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <Loader2 className="size-4 mr-1.5 animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            "I understand, delete this organization"
                        )}
                    </Button>
                </CustomModalFooter>
            </CustomModal>
        </Card>
    );
}
