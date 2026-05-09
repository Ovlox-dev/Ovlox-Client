// Single source of truth for the Firebase client SDK.
// Used by:
//   - shared/lib/firebase/firebase-client.ts (re-exports app/auth/provider helpers)
//   - shared/lib/auth/google-signin.ts (Google sign-in popup flow)
//
// Web app's Firebase configuration. These values are public-by-design — they
// ship to the browser bundle. The actual security boundary is enforced
// server-side: every Firebase ID token issued from this client is verified
// by the backend Admin SDK (see ovlox_v2_backend/src/services/firebase/) before
// any of our own JWTs are issued.

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export const firebaseConfig = {
    apiKey: "AIzaSyBP37prtwS0GvBWm-bkQxNCyjp-pXi7GyA",
    authDomain: "ovlox-20127.firebaseapp.com",
    projectId: "ovlox-20127",
    storageBucket: "ovlox-20127.firebasestorage.app",
    messagingSenderId: "524698593000",
    appId: "1:524698593000:web:3e1bac406ecbd5142bcb5d",
    measurementId: "G-VE72RMXS8P",
};

// Initialize once, even across HMR / dynamic imports / RSC boundaries.
const existingApp = getApps()[0];
export const firebaseApp: FirebaseApp =
    existingApp ?? initializeApp(firebaseConfig);

// Auth is safe to instantiate on both server and client (the SDK gates the
// browser-only operations behind window-level checks internally).
export const firebaseAuth: Auth = getAuth(firebaseApp);

/**
 * Build a fresh GoogleAuthProvider instance. Always force the account
 * selection screen so users on shared machines don't get silently signed
 * back in as the previous user.
 */
export function buildGoogleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    provider.addScope("email");
    provider.addScope("profile");
    return provider;
}

/**
 * Analytics is browser-only — `getAnalytics()` reads `window` at call time
 * and crashes during SSR / RSC. We expose a lazy accessor so analytics is
 * only initialised when something on the client actually asks for it.
 *
 * Returns `null` on the server, or when the browser doesn't support
 * analytics (e.g. private mode, blocked by extensions).
 */
let analyticsInstance: Analytics | null = null;
let analyticsTried = false;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
    if (typeof window === "undefined") return null;
    if (analyticsInstance) return analyticsInstance;
    if (analyticsTried) return null;

    analyticsTried = true;
    try {
        if (await isSupported()) {
            analyticsInstance = getAnalytics(firebaseApp);
            return analyticsInstance;
        }
    } catch {
        // analytics blocked / unsupported — silently no-op
    }
    return null;
}
