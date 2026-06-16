"use client";

import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/entities/auth/model/store";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";

/**
 * Account → set or change password. When the account already has a password (`hasPassword`) the
 * current password is required; a Google-only account sets its first one without it. On success we
 * refresh /user/me so the "Email + password" sign-in method flips to Linked.
 */
export function PasswordSettingsCard({ hasPassword }: { hasPassword: boolean }) {
    const setPassword = useAuthStore((s) => s.auth.setPassword);
    const fetchUser = useAuthStore((s) => s.auth.fetchUser);
    const isLoading = useAuthStore((s) => s.auth.isLoading);

    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (hasPassword && !currentPassword) {
            toast.warning("Enter your current password");
            return;
        }
        if (newPassword.length < 8) {
            toast.warning("Password too short", { description: "Use at least 8 characters." });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords don't match");
            return;
        }
        try {
            await setPassword({ currentPassword: hasPassword ? currentPassword : undefined, newPassword });
            toast.success(hasPassword ? "Password changed" : "Password set");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            void fetchUser({ silent: true });
        } catch (err) {
            toast.error("Couldn't update password", { description: formatAuthErrorMessage(err) });
        }
    };

    return (
        <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 mb-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-(--fg) flex items-center gap-2">
                    <KeyRound className="size-4" />
                    {hasPassword ? "Change password" : "Set a password"}
                </h3>
                <p className="text-xs text-(--fg-3) mt-0.5">
                    {hasPassword
                        ? "Update your account password."
                        : "Add a password so you can sign in with email even without Google."}
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 max-w-md">
                {hasPassword ? (
                    <div className="space-y-1.5">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                ) : null}
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
                    {hasPassword ? "Update password" : "Set password"}
                </Button>
            </form>
        </section>
    );
}
