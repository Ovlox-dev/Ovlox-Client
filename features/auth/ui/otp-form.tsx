"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import Image from "next/image";
import { PlaceholderImage } from "@/assets";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/entities/auth";
import {
    resolvePostLoginAuthNavigation,
    setAuthNavigation,
} from "@/shared/lib/auth/auth-navigation";
import { resolvePostAuthOrgRedirect } from "@/shared/lib/auth/post-auth-org-resolver";

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyOtp, requestOtp, isLoading } = useAuthStore((state) => state.auth);
    const redirectTarget =
        searchParams.get("redirectURI") ?? searchParams.get("from");
    const email = searchParams.get("email") || "";
    const phoneNumber = searchParams.get("phoneNumber") || undefined;
    const [otp, setOtp] = React.useState("");

    React.useEffect(() => {
        setAuthNavigation(redirectTarget);
    }, [redirectTarget]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.warning("Enter 6 digit code");
            return;
        }
        try {
            await verifyOtp({
                otpString: otp,
                email: email || undefined,
                phoneNumber,
            });
            toast.success("Verified", { description: "Your account is verified." });
            const existingPath = resolvePostLoginAuthNavigation(redirectTarget, "");
            if (existingPath) {
                router.replace(existingPath);
                return;
            }
            const { redirectTo } = await resolvePostAuthOrgRedirect();
            router.replace(redirectTo);
        } catch (error: unknown) {
            const description = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message ?? "Invalid or expired code."
                : "Invalid or expired code.";
            toast.error("Verification failed", { description });
        }
    };

    const handleResendOtp = async () => {
        if (!email && !phoneNumber) {
            toast.error("Missing destination", {
                description: "Please restart sign-up or sign-in to request a new code.",
            });
            return;
        }

        try {
            await requestOtp({ email: email || undefined, phoneNumber });
            toast.success("Code sent", { description: "A new verification code has been sent." });
        } catch (error: unknown) {
            const description = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message ?? "Could not resend code."
                : "Could not resend code.";
            toast.error("Resend failed", { description });
        }
    };

    return (
        <div
            className={cn("flex flex-col gap-6 md:min-h-[450px]", className)}
            {...props}
        >
            <Card className="flex-1 overflow-hidden p-0">
                <CardContent className="grid flex-1 p-0 md:grid-cols-2">
                    <form className="flex flex-col items-center justify-center p-6 md:p-8" onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field className="items-center text-center">
                                <h1 className="text-2xl font-bold">Enter verification code</h1>
                                <p className="text-muted-foreground text-sm text-balance">
                                    {email ? `We sent a 6-digit code to ${email}` : phoneNumber ? `We sent a 6-digit code to ${phoneNumber}` : "We sent a 6-digit code"}
                                </p>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="otp" className="sr-only">
                                    Verification code
                                </FieldLabel>
                                <InputOTP
                                    maxLength={6}
                                    id="otp"
                                    required
                                    value={otp}
                                    onChange={(value) => setOtp(value)}
                                >
                                    <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                                <FieldDescription className="text-center">
                                    {email ? `Enter the 6-digit code sent to ${email}` : phoneNumber ? `Enter the 6-digit code sent to ${phoneNumber}` : "Enter the 6-digit code"}
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Verifying..." : "Verify"}
                                </Button>
                                <FieldDescription className="text-center">
                                    Didn&apos;t receive the code?{" "}
                                    <button
                                        type="button"
                                        className="underline underline-offset-2"
                                        onClick={handleResendOtp}
                                        disabled={isLoading}
                                    >
                                        Resend
                                    </button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="bg-muted relative hidden md:block">
                        <Image
                            src={PlaceholderImage}
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
            <FieldDescription className="text-center">
                By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
                and <a href="#">Privacy Policy</a>.
            </FieldDescription>
        </div>
    );
}
