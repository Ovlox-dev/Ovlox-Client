"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    FieldDescription,
    FieldSeparator,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { InputField } from "@/components/form-components";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import signupImage from "@/assets/authImagePng.png";
import { useAuthStore } from "@/entities/auth";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";
import { setAuthNavigation } from "@/shared/lib/auth/auth-navigation";

function buildOtpHref(email: string, redirectTarget: string | null, searchParams: URLSearchParams): string {
    const params = new URLSearchParams();
    params.set("email", email);
    if (redirectTarget) {
        if (searchParams.has("redirectURI")) {
            params.set("redirectURI", redirectTarget);
        } else {
            params.set("from", redirectTarget);
        }
    }
    return `/otp?${params.toString()}`;
}

const signupSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.email({ message: "Invalid email address" }).min(1, { message: "Email is required" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z.string(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signUp, isLoading } = useAuthStore((s) => s.auth);
    const redirectTarget =
        searchParams.get("redirectURI") ?? searchParams.get("from");
    const { handleSubmit, register, formState: { errors }, setError } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        mode: "onChange",
    });

    useEffect(() => {
        setAuthNavigation(redirectTarget);
    }, [redirectTarget]);

    const onSubmit = async (data: SignupFormValues) => {
        if (data.password !== data.confirmPassword) {
            setError("confirmPassword", {
                type: "manual",
                message: "Passwords do not match",
            });
            toast.error("Passwords do not match");
            return;
        }

        try {
            await signUp({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password,
            });
            router.replace(buildOtpHref(data.email, redirectTarget, searchParams));
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        }
    };

    return (
        <div className="max-w-7xl mx-auto h-screen flex justify-center items-center">
            <Card className="border-none shadow-none">
                <CardContent className="grid grid-cols-2">
                    <div className="flex flex-col justify-between gap-8 p-6 md:p-10">
                        <div className="space-y-8">
                            <div className="space-y-2 text-center">
                                <h1 className="text-4xl font-semibold">Welcome to Ovlox</h1>
                                <p className="text-muted-foreground text-base">
                                    You bring the idea. We&apos;ll translate the tech.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="dark:bg-[#111213] dark:border-none hover:bg-background w-full relative"
                                >
                                    <div className="flex items-center gap-3">
                                        <FcGoogle />
                                        <span>Continue with Google</span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] dark:text-[#555A5D] border-[#555A5D] bg-background font-medium tracking-wide absolute -top-2 -right-7 "
                                    >
                                        Last Used
                                    </Badge>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="dark:bg-[#111213] dark:border-none hover:bg-background w-full relative"
                                >
                                    <div className="flex items-center gap-3">
                                        <FaApple />
                                        <span>Continue with Apple</span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] dark:text-[#555A5D] border-[#555A5D] bg-background font-medium tracking-wide absolute -top-2 -right-7 "
                                    >
                                        Last Used
                                    </Badge>
                                </Button>
                            </div>

                            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-background mb-4">
                                Or continue with email
                            </FieldSeparator>

                            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                    <InputField
                                        name="firstName"
                                        label="First name"
                                        placeholder="First name"
                                        register={register}
                                        errors={errors}
                                    />
                                    <InputField
                                        name="lastName"
                                        id="last-name"
                                        label="Last name"
                                        placeholder="Last name"
                                        register={register}
                                        errors={errors}
                                    />
                                </div>
                                <InputField
                                    name="email"
                                    label="Email"
                                    placeholder="you@example.com"
                                    register={register}
                                    errors={errors}
                                />
                                <InputField
                                    name="password"
                                    label="Password"
                                    placeholder="Password"
                                    register={register}
                                    errors={errors}
                                />
                                <InputField
                                    name="confirmPassword"
                                    label="Confirm password"
                                    placeholder="Confirm password"
                                    register={register}
                                    errors={errors}
                                />
                                <Button type="submit" disabled={isLoading} className="w-full bg-card text-white font-medium text-sm hover:bg-[#191b1b]">
                                    {isLoading ? "Creating your account..." : "Continue"}
                                </Button>
                                <FieldDescription className="text-center text-xs">
                                    Already have an account?{" "}
                                    <Link
                                        href={
                                            redirectTarget
                                                ? `/signin?redirectURI=${encodeURIComponent(redirectTarget)}`
                                                : "/signin"
                                        }
                                        className="text-blue-400"
                                    >
                                        Sign in
                                    </Link>
                                </FieldDescription>
                            </form>

                            <FieldDescription className="text-center text-xs">
                                By creating an account, you agree to our <Link href="/" className="text-blue-400">Terms of Service</Link>{" "}
                                and <Link href="#" className="text-blue-400">Privacy Policy</Link>.
                            </FieldDescription>
                        </div>
                    </div>
                    <div className="flex justify-center items-center">
                        <Image
                            height={700}
                            width={700}
                            src={signupImage}
                            alt="Welcome to Ovlox"
                            className="object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
