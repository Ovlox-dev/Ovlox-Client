import { Suspense } from "react"
import { SignupForm } from "@/features/auth";

export default function Signup() {
    return (
        <div className="">
            <Suspense fallback={<div>Loading...</div>}>
                <SignupForm />
            </Suspense>
        </div>
    )
}