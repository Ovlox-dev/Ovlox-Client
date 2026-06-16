"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InputField } from "@/components/form-components";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuthStore } from "@/entities/auth/model/store";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";

const schema = z
    .object({
        otpString: z.string().regex(/^\d{6}$/, { message: "Enter the 6-digit code" }),
        password: z.string().min(8, { message: "Password must be at least 8 characters" }),
        confirmPassword: z.string().min(1, { message: "Confirm your password" }),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";
    const { resetPassword, isLoading } = useAuthStore((s) => s.auth);

    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: { otpString: "", password: "", confirmPassword: "" },
    });

    const onSubmit = async (data: FormValues) => {
        if (!email) {
            toast.error("Missing email", { description: "Restart the reset from the forgot-password page." });
            router.replace("/forgot-password");
            return;
        }
        try {
            await resetPassword({ email, otpString: data.otpString, password: data.password });
            toast.success("Password reset", { description: "Sign in with your new password." });
            router.replace(`/signin?email=${encodeURIComponent(email)}`);
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--line) bg-(--bg-2) mb-5">
                        <span className="size-1.5 rounded-full bg-(--accent-lime) shadow-[0_0_8px_var(--accent-lime)]" />
                        <span className="font-mono uppercase tracking-widest text-[10px] text-(--accent-lime)">
                            Reset password
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-(--fg) leading-tight">
                        Set a new{" "}
                        <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">
                            password.
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-(--fg-2)">
                        {email ? `Enter the code sent to ${email}` : "Enter the code sent to your email"}
                    </p>
                </div>

                <div className="rounded-[14px] border border-(--line) bg-(--bg-2) overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-(--line-2) bg-linear-to-b from-[#181820] to-[#131319]">
                        <div className="flex gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#ff5b6e]" />
                            <span className="size-2.5 rounded-full bg-[#ffb84d]" />
                            <span className="size-2.5 rounded-full bg-[#61d670]" />
                        </div>
                        <span className="ml-2 px-3 py-1 rounded-md bg-(--bg-3) text-(--fg) text-xs font-mono">
                            reset.tsx
                        </span>
                        <div className="ml-auto flex items-center gap-1.5 text-(--fg-3) text-[10px] font-mono uppercase tracking-wider">
                            <span className="size-1.5 rounded-full bg-(--accent-2) shadow-[0_0_6px_var(--accent-2)] animate-pulse" />
                            secure
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            <InputField
                                name="otpString"
                                label="Reset code"
                                placeholder="6-digit code"
                                register={register}
                                errors={errors}
                            />
                            <InputField
                                name="password"
                                label="New password"
                                type="password"
                                placeholder="••••••••"
                                register={register}
                                errors={errors}
                            />
                            <InputField
                                name="confirmPassword"
                                label="Confirm password"
                                type="password"
                                placeholder="••••••••"
                                register={register}
                                errors={errors}
                            />
                            <Button type="submit" disabled={isLoading} className="w-full h-11">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Resetting…
                                    </>
                                ) : (
                                    "Reset password"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-(--fg-3)">
                            Didn&apos;t get a code?{" "}
                            <Link
                                href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                                className="text-(--accent-lime) hover:underline underline-offset-4"
                            >
                                Request again
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
