"use client";

import * as React from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/entities/auth/model/store";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";

/**
 * Set or change the signed-in user's password. `currentPassword` is optional in the UI: accounts
 * created via Google have no password yet and can set their first one without it. The backend enforces
 * the rule (required only when a password already exists) and returns a clear error otherwise.
 */
export function OrgSecuritySettings() {
    const { setPassword, isLoading } = useAuthStore((s) => s.auth);
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.warning("Password too short", { description: "Use at least 8 characters." });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords don't match");
            return;
        }
        try {
            await setPassword({
                currentPassword: currentPassword || undefined,
                newPassword,
            });
            toast.success("Password updated");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            toast.error("Couldn't update password", { description: formatAuthErrorMessage(err) });
        }
    };

    return (
        <Card className="p-6 space-y-5">
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <KeyRound className="size-4" /> Password
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Set or change your account password. If you signed up with Google, leave
                    &ldquo;current password&rdquo; blank to set one for the first time.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current password (optional)</Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Leave blank if you signed up with Google"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter the new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={isLoading || !newPassword || !confirmPassword}>
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Update password
                </Button>
            </form>
        </Card>
    );
}
