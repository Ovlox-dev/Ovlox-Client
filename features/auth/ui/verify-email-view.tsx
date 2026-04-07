"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
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
import { useAuthStore } from "@/entities/auth/model/store";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function VerifyEmailView() {
    const router = useRouter();
    const user = useAuthStore((s) => s.auth.user);
    const { requestOtp, verifyOtpPreserveSession, logout, isLoading } = useAuthStore((s) => s.auth);
    const [otp, setOtp] = useState("");
    const [logoutLoading, setLogoutLoading] = useState(false);

    const email = user?.email ?? undefined;
    const phoneNumber = user?.phoneNumber ?? undefined;
    const destinationLabel = email ?? phoneNumber ?? "your email";

    useEffect(() => {
        if (user?.isVerified) {
            router.replace("/login-success");
        }
    }, [user?.isVerified, router]);

    const sendOtp = async () => {
        if (!email && !phoneNumber) {
            toast.error("No contact on file", {
                description: "Your account has no email or phone to send a code to.",
            });
            return;
        }
        try {
            await requestOtp({ email, phoneNumber });
            toast.success("Code sent", { description: "Check your inbox or messages for the 6-digit code." });
        } catch (error: unknown) {
            const description = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message ?? "Could not send code."
                : "Could not send code.";
            toast.error("Send failed", { description });
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.warning("Enter the 6-digit code");
            return;
        }
        if (!email && !phoneNumber) {
            toast.error("Missing destination", { description: "Cannot verify without email or phone on your account." });
            return;
        }
        try {
            await verifyOtpPreserveSession({
                otpString: otp,
                email,
                phoneNumber,
            });
            toast.success("Email verified", { description: "You’re all set." });
            setOtp("");
        } catch (error: unknown) {
            const description = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message ?? "Invalid or expired code."
                : "Invalid or expired code.";
            toast.error("Verification failed", { description });
        }
    };

    const handleLogout = async () => {
        try {
            setLogoutLoading(true);
            await logout();
            toast.success("Logged out successfully");
            router.replace("/signin");
            setLogoutLoading(false);
        } catch (error) {
            toast.error("Failed to logout", { description: (error as Error).message || "Something went wrong!." });
        } finally {
            setLogoutLoading(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
            <Card className="w-full border-none shadow-none">
                <CardContent className="flex flex-col gap-8 py-12">
                    <FieldGroup>
                        <Field className="items-center text-center">
                            <h1 className="text-2xl font-bold">Verify your email</h1>
                            <p className="text-muted-foreground text-sm text-balance">
                                Use a one-time code sent to{" "}
                                <span className="font-medium text-foreground">{destinationLabel}</span>, or open the
                                link we emailed you and use &quot;Refresh status&quot; below.
                            </p>
                        </Field>

                        <Field className="items-center space-y-3">
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full max-w-xs"
                                disabled={isLoading}
                                onClick={() => void sendOtp()}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    "Send verification code"
                                )}
                            </Button>
                            <FieldDescription className="text-center">
                                Didn&apos;t get it?{" "}
                                <button
                                    type="button"
                                    className="underline underline-offset-2 disabled:opacity-50"
                                    disabled={isLoading}
                                    onClick={() => void sendOtp()}
                                >
                                    Resend code
                                </button>
                            </FieldDescription>
                        </Field>

                        <form className="flex flex-col items-center gap-4" onSubmit={handleVerifyOtp}>
                            <Field className="w-full max-w-md">
                                <FieldLabel htmlFor="verify-email-otp" className="sr-only">
                                    Verification code
                                </FieldLabel>
                                <InputOTP
                                    maxLength={6}
                                    id="verify-email-otp"
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
                                    Enter the 6-digit code to finish verification.
                                </FieldDescription>
                            </Field>
                            <Button type="submit" className="w-full max-w-xs" disabled={isLoading || otp.length !== 6}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Verifying…
                                    </>
                                ) : (
                                    "Verify code"
                                )}
                            </Button>
                        </form>

                        <Field className="items-center border-t border-border pt-6">

                            <Button
                                type="button"
                                variant="outline"
                                className="mt-2 w-full max-w-xs"
                                disabled={isLoading || logoutLoading}
                                onClick={handleLogout}
                            >
                                {logoutLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Logging out…
                                    </>
                                ) : (
                                    "Logout"
                                )}
                            </Button>
                        </Field>
                    </FieldGroup>
                </CardContent>
            </Card>
        </div>
    );
}
