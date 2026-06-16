"use client";

import { useEffect } from "react";
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

const schema = z.object({
    email: z.email({ message: "Invalid email address" }).min(1, { message: "Email is required" }),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get("email") ?? "";
    const { forgotPassword, isLoading } = useAuthStore((s) => s.auth);

    const {
        handleSubmit,
        register,
        formState: { errors },
        setValue,
        getValues,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: { email: emailFromQuery },
    });

    useEffect(() => {
        if (!emailFromQuery || getValues("email")) { return; }
        setValue("email", emailFromQuery, { shouldValidate: true });
    }, [emailFromQuery, getValues, setValue]);

    const onSubmit = async (data: FormValues) => {
        try {
            await forgotPassword({ email: data.email });
            // Generic success regardless — the backend never reveals whether the email is registered.
            toast.success("Check your email", {
                description: "If an account exists, a reset code has been sent.",
            });
            router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
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
                        Forgot your{" "}
                        <span className="serif italic bg-linear-to-br from-(--accent-lime) via-(--accent-3) to-(--accent-4) bg-clip-text text-transparent">
                            password?
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-(--fg-2)">
                        Enter your email and we&apos;ll send you a reset code.
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
                            forgot.tsx
                        </span>
                        <div className="ml-auto flex items-center gap-1.5 text-(--fg-3) text-[10px] font-mono uppercase tracking-wider">
                            <span className="size-1.5 rounded-full bg-(--accent-2) shadow-[0_0_6px_var(--accent-2)] animate-pulse" />
                            secure
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            <InputField
                                name="email"
                                label="Email"
                                placeholder="you@company.com"
                                register={register}
                                errors={errors}
                            />
                            <Button type="submit" disabled={isLoading} className="w-full h-11">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    "Send reset code"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-(--fg-3)">
                            Remembered it?{" "}
                            <Link
                                href="/signin"
                                className="text-(--accent-lime) hover:underline underline-offset-4"
                            >
                                Back to sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
