"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { InputField } from "@/components/form-components";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import signinImage from "@/assets/authImagePng.png";
import { useAuthStore } from "@/entities/auth/model/store";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";
import {
    resolvePostLoginAuthNavigation,
    setAuthNavigation,
} from "@/shared/lib/auth/auth-navigation";
import {
    buildDashboardOrgRoute,
    getActiveOrgId,
    resolvePostAuthOrgRedirect,
} from "@/shared/lib/auth/post-auth-org-resolver";
import { signInWithGoogle } from "@/shared/lib/auth/google-signin";

const loginSchema = z.object({
    email: z.email({ message: "Invalid email address" }).min(1, { message: "Email is required" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function SigninForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isLoading } = useAuthStore((s) => s.auth);
    const redirectTarget =
        searchParams.get("redirectURI") ?? searchParams.get("from");
    const emailFromQuery = searchParams.get("email") ?? "";
    const [googleLoading, setGoogleLoading] = useState(false);

    const {
        handleSubmit,
        register,
        formState: { errors },
        setValue,
        getValues,
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: { email: emailFromQuery, password: "" },
    });

    useEffect(() => {
        setAuthNavigation(redirectTarget);
    }, [redirectTarget]);

    useEffect(() => {
        if (!emailFromQuery) {return;}
        if (getValues("email")) {return;}
        setValue("email", emailFromQuery, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
        });
    }, [emailFromQuery, getValues, setValue]);

    const handlePostAuthNav = async () => {
        const existingPath = resolvePostLoginAuthNavigation(redirectTarget, "");
        if (existingPath) {
            router.replace(existingPath);
            return;
        }
        const storedOrgId = getActiveOrgId();
        if (storedOrgId) {
            router.replace(buildDashboardOrgRoute(storedOrgId));
            return;
        }
        const { redirectTo } = await resolvePostAuthOrgRedirect();
        router.replace(redirectTo);
    };

    const onSubmit = async (data: LoginFormValues) => {
        try {
            await login({ email: data.email, password: data.password });
            await handlePostAuthNav();
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        }
    };

    const onGoogle = async () => {
        try {
            setGoogleLoading(true);
            await signInWithGoogle();
            await handlePostAuthNav();
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 items-center">
                {/* FORM COLUMN */}
                <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
                {/* HERO */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--line) bg-(--bg-2) mb-5">
                        <span className="size-1.5 rounded-full bg-(--accent-lime) shadow-[0_0_8px_var(--accent-lime)]" />
                        <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                            Sign in
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-(--fg) leading-tight">
                        Welcome <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">back.</span>
                    </h1>
                    <p className="mt-2 text-sm text-(--fg-2)">
                        Continue where you left off.
                    </p>
                </div>

                {/* FORM CARD */}
                <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                    {/* Frame titlebar */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-(--line-2) bg-linear-to-b from-[#181820] to-[#131319]">
                        <div className="flex gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#ff5b6e]" />
                            <span className="size-2.5 rounded-full bg-[#ffb84d]" />
                            <span className="size-2.5 rounded-full bg-[#61d670]" />
                        </div>
                        <span className="ml-2 px-3 py-1 rounded-md bg-(--bg-3) text-(--fg) text-xs font-mono">
                            signin.tsx
                        </span>
                        <div className="ml-auto flex items-center gap-1.5 text-(--fg-3) text-[10px] font-mono uppercase tracking-wider">
                            <span className="size-1.5 rounded-full bg-(--accent-2) shadow-[0_0_6px_var(--accent-2)] animate-pulse" />
                            secure
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11"
                            onClick={onGoogle}
                            disabled={googleLoading || isLoading}
                        >
                            {googleLoading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Connecting…
                                </>
                            ) : (
                                <>
                                    <FcGoogle className="size-5" />
                                    Continue with Google
                                </>
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-(--line-2)" />
                            </div>
                            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
                                <span className="bg-(--bg-2) px-3 text-(--fg-3)">
                                    or with email
                                </span>
                            </div>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            <InputField
                                name="email"
                                label="Email"
                                placeholder="you@company.com"
                                register={register}
                                errors={errors}
                            />
                            <InputField
                                name="password"
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                register={register}
                                errors={errors}
                            />
                            <div className="-mt-1 text-right">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-(--fg-3) hover:text-(--accent-lime) underline underline-offset-4"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading || googleLoading}
                                className="w-full h-11"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Signing in…
                                    </>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-(--fg-3)">
                            Don&apos;t have an account?{" "}
                            <Link
                                href={
                                    redirectTarget
                                        ? `/signup?redirectURI=${encodeURIComponent(redirectTarget)}`
                                        : "/signup"
                                }
                                className="text-(--accent-lime) hover:underline underline-offset-4"
                            >
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-6 text-center text-[11px] text-(--fg-3) max-w-sm mx-auto leading-relaxed">
                    By continuing, you agree to our{" "}
                    <Link href="/terms-of-service" className="text-(--fg-2) hover:text-(--accent-lime) underline underline-offset-2">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy-policy" className="text-(--fg-2) hover:text-(--accent-lime) underline underline-offset-2">
                        Privacy Policy
                    </Link>
                    .
                </p>
                </div>
                {/* IMAGE COLUMN */}
                <div className="hidden lg:flex items-center justify-center">
                    <div className="relative w-full max-w-lg aspect-square">
                        {/* soft lime/teal halo behind the image */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -inset-10 rounded-full opacity-50 blur-3xl"
                            style={{
                                background:
                                    "radial-gradient(ellipse at 50% 50%, rgba(200,255,62,0.12), rgba(74,243,217,0.08) 40%, transparent 70%)",
                            }}
                        />
                        <Image
                            src={signinImage}
                            alt="Welcome to Ovlox"
                            priority
                            sizes="(min-width: 1024px) 40vw, 100vw"
                            className="relative w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
