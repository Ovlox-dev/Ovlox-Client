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
import signinImage from "@/assets/authImagePng.png";
import { useAuthStore } from "@/entities/auth/model/store";
import { formatAuthErrorMessage } from "@/shared/lib/auth/auth-utils";
import { resolvePostLoginAuthNavigation, setAuthNavigation } from "@/shared/lib/auth/auth-navigation";
import { buildDashboardOrgRoute, DASHBOARD_NEW_ORGANIZATION_ROUTE, getActiveOrgId, setActiveOrgId } from "@/shared/lib/auth/post-auth-org-resolver";
import { userOrgs } from "@/shared/api/org";

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
    const { handleSubmit, register, formState: { errors }, setValue, getValues } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            email: emailFromQuery,
            password: "",
        },
    });

    useEffect(() => {
        setAuthNavigation(redirectTarget);
    }, [redirectTarget]);

    useEffect(() => {
        if (!emailFromQuery) { return; }
        if (getValues("email")) { return; }
        setValue("email", emailFromQuery, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    }, [emailFromQuery, getValues, setValue]);

    const onSubmit = async (data: LoginFormValues) => {
        try {
            await login({ email: data.email, password: data.password });
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

            const response = await userOrgs();
            const orgs = response.data ?? [];
            if (orgs.length === 0) {
                setActiveOrgId(null);
                router.replace(DASHBOARD_NEW_ORGANIZATION_ROUTE);
                return;
            }

            const chosen = orgs[0]?.id ?? null;
            setActiveOrgId(chosen);
            router.replace(chosen ? buildDashboardOrgRoute(chosen) : DASHBOARD_NEW_ORGANIZATION_ROUTE);
        } catch (error) {
            toast.error(formatAuthErrorMessage(error));
        }
    };

    return (
        <div className="mx-auto max-w-7xl h-screen flex justify-center items-center">
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
                                <Button type="submit" disabled={isLoading} className="w-full bg-card text-white font-medium text-sm hover:bg-[#191b1b]">
                                    {isLoading ? "Signing in..." : "Continue"}
                                </Button>
                                <FieldDescription className="text-center text-xs">
                                    Don&apos;t have an account?{" "}
                                    <Link
                                        href={
                                            redirectTarget
                                                ? `/signup?redirectURI=${encodeURIComponent(redirectTarget)}`
                                                : "/signup"
                                        }
                                        className="text-blue-400"
                                    >
                                        Create one
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
                            src={signinImage}
                            alt="Welcome to Ovlox"
                            className="object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
