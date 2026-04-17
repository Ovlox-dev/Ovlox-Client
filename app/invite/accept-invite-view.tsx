"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite, declineInvite } from "@/shared/api/org";
import {
    buildDashboardOrgRoute,
    setActiveOrgId,
} from "@/shared/lib/auth/post-auth-org-resolver";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";
import { useAuthStore } from "@/entities/auth/model/store";
import { cn } from "@/lib/utils";

export function AcceptInviteView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, authStatus, bootstrapSession } = useAuthStore((state) => state.auth);
    const tokenFromUrl = useMemo(() => {
        const raw = searchParams.get("token") ?? searchParams.get("code") ?? "";
        const trimmed = raw.trim();
        const unquoted =
            (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
                ? trimmed.slice(1, -1).trim()
                : trimmed;
        try {
            return decodeURIComponent(unquoted);
        } catch {
            return unquoted;
        }
    }, [searchParams]);

    const [pastedToken, setPastedToken] = useState("");
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

    useEffect(() => {
        bootstrapSession().catch(() => undefined);
    }, [bootstrapSession]);

    useEffect(() => {
        setPastedToken("");
    }, [tokenFromUrl]);

    const effectiveToken = tokenFromUrl || pastedToken.trim();
    const returnTo = useMemo(() => {
        if (!effectiveToken) { return "/invite"; }
        return `/invite?token=${encodeURIComponent(effectiveToken)}`;
    }, [effectiveToken]);

    const isUnauthenticated = authStatus !== "authenticated" || !user;

    const handleAccept = async () => {
        if (!effectiveToken) {
            toast.error("Add an invite code or open the link from your email.");
            return;
        }

        if (isUnauthenticated) {
            toast.error("Please sign up or sign in to accept the invitation.");
            router.replace(`/signup?redirectURI=${encodeURIComponent(returnTo)}`);
            return;
        }

        try {
            setIsAccepting(true);
            const member = await acceptInvite(effectiveToken);
            const orgId = member.organizationId ?? member.organization?.id;
            if (!orgId) {
                toast.error("Invitation accepted, but we could not open your workspace.");
                return;
            }

            setActiveOrgId(orgId);
            toast.success("You’ve joined the workspace.");
            router.replace(buildDashboardOrgRoute(orgId));
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        } finally {
            setIsAccepting(false);
        }
    };

    const handleReject = async () => {
        if (!effectiveToken) {
            toast.error("Add an invite code or open the link from your email.");
            return;
        }

        try {
            setIsDeclining(true);
            await declineInvite(effectiveToken);
            toast.success("Invitation declined.");
            router.replace("/");
        } catch (error) {
            const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
            if (status === 401 || status === 403) {
                toast.error("Please sign up or sign in to reject the invitation.");
                router.replace(`/signup?redirectURI=${encodeURIComponent(returnTo)}`);
                return;
            }

            toast.error(formatAuthErrorMessage(error));
        } finally {
            setIsDeclining(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16">
            <div
                className={cn(
                    "pointer-events-none absolute inset-0 overflow-hidden",
                    "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.18),transparent)]"
                )}
            />

            <Card className="relative w-full max-w-md border-border shadow-lg rounded-2xl">
                <CardHeader className="space-y-4 text-center pb-2">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/20">
                        <Building2 className="size-7" strokeWidth={1.75} />
                    </div>
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            Accept invitation
                        </CardTitle>
                        <CardDescription className="text-base text-pretty">
                            Join your team on Ovlox with the invite from your email.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 px-6">
                    {tokenFromUrl ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                <Sparkles className="size-4 shrink-0 text-accent mt-0.5" />
                                <p>
                                    {isUnauthenticated
                                        ? "You’re almost there — sign up or sign in to accept this invitation."
                                        : "Your invite link is ready. When you continue, you’ll be added to the workspace and taken to its dashboard."}
                                </p>
                            </div>

                            {isUnauthenticated ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Button
                                        type="button"
                                        className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium h-11"
                                        onClick={() =>
                                            router.replace(
                                                `/signup?redirectURI=${encodeURIComponent(returnTo)}`
                                            )
                                        }
                                    >
                                        Sign up to continue
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full font-medium h-11"
                                        onClick={() =>
                                            router.replace(
                                                `/signin?redirectURI=${encodeURIComponent(returnTo)}`
                                            )
                                        }
                                    >
                                        Sign in
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="invite-token" className="text-foreground">
                                Invite code
                            </Label>
                            <Input
                                id="invite-token"
                                name="invite-token"
                                autoComplete="off"
                                placeholder="Paste the code from your invitation"
                                value={pastedToken}
                                onChange={(e) => setPastedToken(e.target.value)}
                                className="rounded-lg border-border bg-background"
                            />
                            <p className="text-xs text-muted-foreground">
                                If your email has a button, use that link instead — it fills this
                                step automatically.
                            </p>
                        </div>
                    )}

                    <Button
                        type="button"
                        className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium h-11"
                        disabled={isAccepting || isDeclining || !effectiveToken}
                        onClick={handleAccept}
                    >
                        {isAccepting ? "Joining workspace…" : "Accept invitation"}
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full rounded-full font-medium h-11"
                        disabled={isAccepting || isDeclining || !effectiveToken}
                        onClick={handleReject}
                    >
                        {isDeclining ? "Declining…" : "Reject invitation"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
