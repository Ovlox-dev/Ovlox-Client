"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    Building2,
    CheckCircle2,
    Loader2,
    Mail,
    ShieldAlert,
    UserX,
    XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    acceptInvite,
    declineInvite,
    userOrgs,
} from "@/entities/organization/api/org";
import {
    buildDashboardOrgRoute,
    setActiveOrgId,
} from "@/shared/lib/auth/post-auth-org-resolver";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";
import { useAuthStore } from "@/entities/auth/model/store";
import { getInitials } from "@/shared/lib/use-initials";

/**
 * Invite links were briefly generated as `/invites?token=UUID?email=...`
 * (invalid: second `?`). The query parser then returns `token = UUID?email=...`.
 * Split so API and redirects stay valid.
 */
function splitTokenAndEmbeddedEmail(tokenParam: string): {
    token: string;
    embeddedEmail?: string;
} {
    const trimmed = tokenParam.trim();
    if (!trimmed) return { token: "" };
    const match = trimmed.match(/^(.*?)(\?email=|&email=)(.*)$/i);
    if (!match?.[1]?.trim()) return { token: trimmed };
    const tokenPart = match[1].trim();
    let emailPart = (match[3] ?? "").trim();
    const amp = emailPart.indexOf("&");
    if (amp >= 0) emailPart = emailPart.slice(0, amp).trim();
    if (!tokenPart) return { token: trimmed };
    try {
        return { token: tokenPart, embeddedEmail: decodeURIComponent(emailPart) };
    } catch {
        return { token: tokenPart, embeddedEmail: emailPart };
    }
}

function decodeQueryString(raw: string | null): string {
    if (!raw) return "";
    const trimmed = raw.trim();
    const unquoted =
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ? trimmed.slice(1, -1).trim()
            : trimmed;
    try {
        return decodeURIComponent(unquoted);
    } catch {
        return unquoted;
    }
}

export function AcceptInviteView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, authStatus, bootstrapSession, logout } = useAuthStore(
        (state) => state.auth
    );

    /* -------- token + invite-email parsing -------- */

    const decodedTokenParam = useMemo(
        () =>
            decodeQueryString(
                searchParams.get("token") ?? searchParams.get("code") ?? ""
            ),
        [searchParams]
    );
    const { token: inviteToken, embeddedEmail: embeddedEmailFromToken } = useMemo(
        () => splitTokenAndEmbeddedEmail(decodedTokenParam),
        [decodedTokenParam]
    );
    const emailFromQuery = useMemo(
        () => decodeQueryString(searchParams.get("email")),
        [searchParams]
    );
    const resolvedInviteEmail = (
        emailFromQuery ||
        embeddedEmailFromToken ||
        ""
    ).trim();

    const [pastedToken, setPastedToken] = useState("");
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

    /* -------- bootstrap session on mount -------- */

    useEffect(() => {
        bootstrapSession().catch(() => undefined);
    }, [bootstrapSession]);

    useEffect(() => {
        setPastedToken("");
    }, [inviteToken]);

    const pastedTokenClean = useMemo(
        () =>
            pastedToken.trim()
                ? splitTokenAndEmbeddedEmail(pastedToken.trim()).token
                : "",
        [pastedToken]
    );

    const effectiveToken = inviteToken || pastedTokenClean;
    const returnTo = useMemo(() => {
        if (!effectiveToken) return "/invites";
        const params = new URLSearchParams();
        params.set("token", effectiveToken);
        if (resolvedInviteEmail) params.set("email", resolvedInviteEmail);
        return `/invites?${params.toString()}`;
    }, [effectiveToken, resolvedInviteEmail]);

    const buildSigninUrl = (path: "/signin" | "/signup" = "/signin") => {
        const params = new URLSearchParams();
        params.set("redirectURI", returnTo);
        if (resolvedInviteEmail) params.set("email", resolvedInviteEmail);
        return `${path}?${params.toString()}`;
    };

    /* -------- auth states ----------------------- */

    const isResolvingAuth = authStatus === "loading" || authStatus === "idle";
    const isUnauthenticated = authStatus === "unauthenticated" || !user;

    /**
     * AUTO-REDIRECT: if the visitor isn't signed in and we have a token to
     * pin to the redirect URL, send them straight to /signin instead of
     * showing the in-card "Sign in" buttons. Wait for bootstrap to finish
     * so we don't bounce a user who's actually authenticated but just
     * hadn't been hydrated yet.
     */
    useEffect(() => {
        if (isResolvingAuth) return;
        if (!isUnauthenticated) return;
        if (!effectiveToken) return; // let them paste a code in if they have one
        router.replace(buildSigninUrl("/signin"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResolvingAuth, isUnauthenticated, effectiveToken]);

    /* -------- mismatch detection ---------------- */

    const signedInEmail = (user?.email ?? "").trim().toLowerCase();
    const inviteEmailLower = resolvedInviteEmail.trim().toLowerCase();
    const isEmailMismatch =
        !!user && !!inviteEmailLower && !!signedInEmail && signedInEmail !== inviteEmailLower;

    /* -------- handlers --------------------------- */

    const handleSwitchAccount = async () => {
        try {
            setIsSwitchingAccount(true);
            await logout();
            toast.success("Signed out — sign in with the invited email.");
            router.replace(buildSigninUrl("/signin"));
        } catch (err) {
            toast.error(formatAuthErrorMessage(err));
        } finally {
            setIsSwitchingAccount(false);
        }
    };

    const handleAccept = async () => {
        if (!effectiveToken) {
            toast.error("Add an invite code or open the link from your email.");
            return;
        }
        if (isUnauthenticated) {
            router.replace(buildSigninUrl("/signin"));
            return;
        }
        if (isEmailMismatch) {
            // Belt-and-suspenders — UI hides the button anyway, but if it
            // somehow triggers, sketch out the right path.
            toast.error("This invite is for a different email.");
            return;
        }

        try {
            setIsAccepting(true);
            const member = await acceptInvite(effectiveToken);
            const orgsResponse = await userOrgs();
            const orgs = orgsResponse.data ?? [];
            const fromMember =
                member.organizationId ?? member.organization?.id ?? null;
            const orgId = fromMember ?? orgs[0]?.id ?? null;
            if (!orgId) {
                toast.error(
                    "Invitation accepted, but we could not open your workspace."
                );
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
            const status = (error as { response?: { status?: number } } | undefined)
                ?.response?.status;
            if (status === 401 || status === 403) {
                router.replace(buildSigninUrl("/signin"));
                return;
            }
            toast.error(formatAuthErrorMessage(error));
        } finally {
            setIsDeclining(false);
        }
    };

    /* -------- render --------------------------- */

    // While the session is bootstrapping, OR while we're about to redirect
    // an unauthenticated visitor with a token, show the loader instead of
    // flashing the auth options.
    if (isResolvingAuth || (isUnauthenticated && effectiveToken)) {
        return (
            <div className="relative min-h-screen flex items-center justify-center bg-(--bg) overflow-hidden">
                <div className="aurora" aria-hidden="true" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <Loader2 className="size-6 animate-spin text-(--fg-3)" />
                    <p className="text-sm text-(--fg-3) font-mono">
                        Checking your session…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-(--bg) px-4 py-16 overflow-hidden">
            <div className="aurora" aria-hidden="true" />

            <div className="relative z-10 w-full max-w-md">
                {/* HERO */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--line) bg-(--bg-2) mb-4">
                        <span className="size-1.5 rounded-full bg-(--accent-lime) shadow-[0_0_8px_var(--accent-lime)]" />
                        <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                            Workspace invite
                        </span>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-(--fg) leading-tight">
                        Accept your{" "}
                        <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">
                            invitation.
                        </span>
                    </h1>
                </div>

                {/* MAIN CARD */}
                <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-(--line-2) bg-linear-to-b from-[#181820] to-[#131319]">
                        <div className="flex gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#ff5b6e]" />
                            <span className="size-2.5 rounded-full bg-[#ffb84d]" />
                            <span className="size-2.5 rounded-full bg-[#61d670]" />
                        </div>
                        <span className="ml-2 px-3 py-1 rounded-md bg-(--bg-3) text-(--fg) text-xs font-mono">
                            invite.tsx
                        </span>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* IDENTITY ROW — show who's signed in */}
                        {user ? (
                            <SignedInRow
                                user={user}
                                onSwitch={handleSwitchAccount}
                                switching={isSwitchingAccount}
                                showSwitch={isEmailMismatch}
                            />
                        ) : null}

                        {/* TOKEN-PRESENT path */}
                        {inviteToken ? (
                            isEmailMismatch ? (
                                <MismatchWarning
                                    inviteEmail={resolvedInviteEmail}
                                    signedInEmail={user?.email ?? ""}
                                    onSwitch={handleSwitchAccount}
                                    switching={isSwitchingAccount}
                                />
                            ) : (
                                <ReadyBlock inviteEmail={resolvedInviteEmail} />
                            )
                        ) : (
                            // No token in URL — let the user paste it.
                            <div className="space-y-2">
                                <Label
                                    htmlFor="invite-token"
                                    className="text-xs font-mono uppercase tracking-wider text-(--fg-3)"
                                >
                                    Invite code
                                </Label>
                                <Input
                                    id="invite-token"
                                    name="invite-token"
                                    autoComplete="off"
                                    placeholder="Paste the code from your invitation"
                                    value={pastedToken}
                                    onChange={(e) =>
                                        setPastedToken(e.target.value)
                                    }
                                />
                                <p className="text-xs text-(--fg-3)">
                                    If your email has a button, use that link
                                    instead — it fills this step automatically.
                                </p>
                            </div>
                        )}

                        {/* ACTION BUTTONS */}
                        <div className="space-y-2 pt-2">
                            <Button
                                type="button"
                                className="w-full"
                                size="lg"
                                disabled={
                                    isAccepting ||
                                    isDeclining ||
                                    isSwitchingAccount ||
                                    !effectiveToken ||
                                    isEmailMismatch
                                }
                                onClick={handleAccept}
                            >
                                {isAccepting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Joining workspace…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="size-4" />
                                        Accept invitation
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={
                                    isAccepting ||
                                    isDeclining ||
                                    isSwitchingAccount ||
                                    !effectiveToken
                                }
                                onClick={handleReject}
                            >
                                {isDeclining ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Declining…
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="size-4" />
                                        Decline
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------ subcomponents ------------ */

function SignedInRow({
    user,
    onSwitch,
    switching,
    showSwitch,
}: {
    user: { email: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null };
    onSwitch: () => void;
    switching: boolean;
    showSwitch: boolean;
}) {
    const fullName =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.email ||
        "Account";
    const initials = getInitials(fullName);
    return (
        <div className="flex items-center gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-3 py-2.5">
            <Avatar className="size-8 rounded-[8px] border border-(--line-2) shrink-0">
                {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={fullName} />
                ) : null}
                <AvatarFallback className="rounded-[8px] bg-(--bg-2) text-(--accent-lime) text-xs font-semibold">
                    {initials || "?"}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
                    Signed in as
                </p>
                <p className="text-sm text-(--fg) truncate font-medium">
                    {user.email ?? fullName}
                </p>
            </div>
            {showSwitch ? (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onSwitch}
                    disabled={switching}
                >
                    {switching ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <UserX className="size-3.5" />
                    )}
                    Switch
                </Button>
            ) : null}
        </div>
    );
}

function ReadyBlock({ inviteEmail }: { inviteEmail: string }) {
    return (
        <div className="rounded-[10px] border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.06)] px-4 py-3">
            <div className="flex items-start gap-3">
                <Building2 className="size-4 shrink-0 text-(--accent-2) mt-0.5" />
                <div className="min-w-0 text-sm">
                    <p className="text-(--fg)">
                        You’ve been invited to join an Ovlox workspace.
                    </p>
                    {inviteEmail ? (
                        <p className="text-xs text-(--fg-3) font-mono mt-1 inline-flex items-center gap-1.5">
                            <Mail className="size-3" />
                            {inviteEmail}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function MismatchWarning({
    inviteEmail,
    signedInEmail,
    onSwitch,
    switching,
}: {
    inviteEmail: string;
    signedInEmail: string;
    onSwitch: () => void;
    switching: boolean;
}) {
    return (
        <div className="rounded-[10px] border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.06)] p-4 space-y-3">
            <div className="flex items-start gap-3">
                <ShieldAlert className="size-5 shrink-0 text-(--warn) mt-0.5" />
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-(--fg)">
                        Wrong account
                    </p>
                    <p className="text-xs text-(--fg-2) leading-relaxed">
                        This invitation was sent to{" "}
                        <span className="font-mono text-(--fg)">
                            {inviteEmail}
                        </span>
                        , but you’re signed in as{" "}
                        <span className="font-mono text-(--fg)">
                            {signedInEmail}
                        </span>
                        . Sign out and back in with the invited email to
                        continue.
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onSwitch}
                disabled={switching}
            >
                {switching ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing out…
                    </>
                ) : (
                    <>
                        <UserX className="size-4" />
                        Sign out & switch account
                    </>
                )}
            </Button>
        </div>
    );
}
