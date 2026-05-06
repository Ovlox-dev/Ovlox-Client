import { Suspense } from "react"
import { SigninForm } from "@/features/auth";

export default function Signin() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SigninForm />
        </Suspense>
    )
}