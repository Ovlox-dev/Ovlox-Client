"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Mail, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { useAuthStore } from "@/entities/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/shared/lib/use-initials";
import {
    AuthProvider as AuthProviderEnum,
    AccountType as AccountTypeEnum,
} from "@/types/enum";
import { getActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver";

export default function AccountPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.auth.user);
    const isLoading = useAuthStore((s) => s.auth.isLoading);
    const status = useAuthStore((s) => s.auth.authStatus);
    const fetchUser = useAuthStore((s) => s.auth.fetchUser);
    const logout = useAuthStore((s) => s.auth.logout);

    // Always pull a fresh /user/me on mount — the cached user from the auth
    // store may be stale and missing `authIdentities` (which only the GET
    // /user/me query populates). The fetch is idempotent in the store.
    useEffect(() => {
        if (status === "loading") return;
        if (!user || user.authIdentities === undefined) {
            void fetchUser({ silent: true });
        }
    }, [user, status, fetchUser]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Signed out");
            router.replace("/signin");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to sign out");
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-(--fg-3)" />
            </div>
        );
    }

    const fullName =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.email ||
        "Account";
    const initials = getInitials(fullName);

    // Detect linked sign-in methods. We check both `provider` (OTP / PASSWORD /
    // GOOGLE) and `type` (GUEST / EMAIL / PHONE / GOOGLE) on every AuthIdentity
    // row so the UI works regardless of which axis the row was tagged on.
    const identities = user.authIdentities ?? [];
    const hasGoogle = identities.some(
        (i) =>
            i.provider === AuthProviderEnum.GOOGLE ||
            i.type === AccountTypeEnum.GOOGLE
    );
    const hasPassword = identities.some(
        (i) =>
            i.provider === AuthProviderEnum.PASSWORD ||
            i.provider === AuthProviderEnum.OTP ||
            i.type === AccountTypeEnum.EMAIL ||
            i.type === AccountTypeEnum.PHONE
    );

    const orgId = getActiveOrgId();
    const dashboardHref = orgId ? `/${orgId}/dashboard` : "/";

    return (
        <div className="min-h-screen bg-(--bg) relative overflow-hidden">
            <div className="aurora" aria-hidden="true" />

            <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href={dashboardHref}
                        className="inline-flex items-center gap-1.5 text-(--fg-3) hover:text-(--fg) transition-colors text-sm"
                    >
                        <ArrowLeft className="size-4" />
                        Back to dashboard
                    </Link>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        disabled={isLoading}
                    >
                        <LogOut className="size-3.5" />
                        Sign out
                    </Button>
                </div>

                {/* Hero */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--line) bg-(--bg-2) mb-5">
                        <span className="size-1.5 rounded-full bg-(--accent-lime) shadow-[0_0_8px_var(--accent-lime)]" />
                        <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                            Your account
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-(--fg) leading-tight">
                        Profile <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">& settings.</span>
                    </h1>
                    <p className="mt-2 text-sm text-(--fg-2) max-w-md mx-auto">
                        Personal info, sign-in methods, and security.
                    </p>
                </div>

                {/* Profile card */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 mb-5">
                    <div className="flex items-start gap-5">
                        <Avatar className="size-16 shrink-0 rounded-[14px] border border-(--line-2)">
                            {user.avatarUrl ? (
                                <AvatarImage asChild src={user.avatarUrl} alt={fullName}>
                                    <Image
                                        src={user.avatarUrl}
                                        alt={fullName}
                                        width={64}
                                        height={64}
                                    />
                                </AvatarImage>
                            ) : null}
                            <AvatarFallback className="rounded-[14px] bg-(--bg-3) text-(--accent-lime) font-semibold text-lg">
                                {initials || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold text-(--fg) truncate capitalize">
                                {fullName}
                            </h2>
                            <p className="text-sm text-(--fg-3) truncate flex items-center gap-1.5 mt-0.5 font-mono">
                                <Mail className="size-3.5" />
                                {user.email ?? "no email on file"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-(--line-2) bg-(--bg-3) font-mono uppercase tracking-wider text-[10px] font-semibold text-(--fg-3)">
                                    {user.role ?? "USER"}
                                </span>
                                {user.isVerified ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] font-mono uppercase tracking-wider text-[10px] font-semibold text-(--accent-2)">
                                        <ShieldCheck className="size-3" />
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.12)] font-mono uppercase tracking-wider text-[10px] font-semibold text-(--warn)">
                                        Unverified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sign-in methods */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6 mb-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-(--fg)">Sign-in methods</h3>
                        <p className="text-xs text-(--fg-3) mt-0.5">
                            How you can authenticate to Ovlox.
                        </p>
                    </div>
                    <div className="space-y-2.5">
                        <ProviderRow
                            icon={<FcGoogle className="size-5" />}
                            label="Google"
                            value={hasGoogle ? user.email ?? "Linked" : "Not linked"}
                            connected={hasGoogle}
                        />
                        <ProviderRow
                            icon={<Lock className="size-4 text-(--fg-2)" />}
                            label="Email + password"
                            value={hasPassword ? user.email ?? "Linked" : "Not linked"}
                            connected={hasPassword}
                        />
                    </div>
                </section>

                {/* Identifiers */}
                <section className="rounded-[14px] border border-(--line) bg-(--bg-2) p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-(--fg)">Account identifiers</h3>
                        <p className="text-xs text-(--fg-3) mt-0.5">
                            Useful when contacting support.
                        </p>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <IdRow label="User ID" value={user.id} mono copyable />
                        <IdRow label="Email" value={user.email ?? "—"} />
                        {user.phoneNumber ? (
                            <IdRow label="Phone" value={user.phoneNumber} />
                        ) : null}
                        {user.lastLogin ? (
                            <IdRow
                                label="Last login"
                                value={new Date(user.lastLogin).toLocaleString()}
                            />
                        ) : null}
                    </dl>
                </section>
            </div>
        </div>
    );
}

function ProviderRow({
    icon,
    label,
    value,
    connected,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    connected: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-(--line-2) bg-(--bg-3) px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 shrink-0 grid place-items-center rounded-[8px] border border-(--line-2) bg-(--bg-2)">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-(--fg)">{label}</p>
                    <p className="text-xs text-(--fg-3) truncate font-mono mt-0.5">
                        {value}
                    </p>
                </div>
            </div>
            <span
                className={
                    connected
                        ? "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.12)] text-(--accent-2)"
                        : "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-[10px] font-semibold border border-(--line-2) bg-(--bg-2) text-(--fg-3)"
                }
            >
                {connected ? "Linked" : "Not linked"}
            </span>
        </div>
    );
}

function IdRow({
    label,
    value,
    mono,
    copyable,
}: {
    label: string;
    value: string;
    mono?: boolean;
    copyable?: boolean;
}) {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error(`Couldn't copy ${label}`);
        }
    };
    return (
        <div className="rounded-[8px] border border-(--line-2) bg-(--bg-3) px-3 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
                {label}
            </dt>
            <dd
                className={`mt-0.5 text-sm text-(--fg) truncate ${mono ? "font-mono" : ""} ${copyable ? "cursor-pointer hover:text-(--accent-lime) transition-colors" : ""}`}
                onClick={copyable ? handleCopy : undefined}
                title={copyable ? "Click to copy" : undefined}
            >
                {value}
            </dd>
        </div>
    );
}
