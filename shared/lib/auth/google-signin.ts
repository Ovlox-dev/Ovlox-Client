import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import {
    buildGoogleProvider,
    getFirebaseAuth,
} from "@/shared/lib/firebase/firebase-client";
import { signInGoogle } from "@/shared/api/auth";
import { useAuthStore } from "@/entities/auth/model/store";
import { setAccessToken } from "@/shared/lib/auth/token-service";
import { setSessionUserId } from "@/shared/lib/auth/session-storage";

/**
 * End-to-end Google sign-in:
 *   1. Open Google popup via Firebase client SDK.
 *   2. Read the Firebase ID token (NOT the Google access token — we
 *      specifically want the JWT Firebase signs so the backend can verify
 *      it against this Firebase project).
 *   3. POST that token to our backend `/auth/google`. Backend verifies via
 *      Firebase Admin and returns our own access/refresh tokens + user.
 *   4. Apply the result to the auth store the same way we do for
 *      email/password signin (cookies are set server-side; access token
 *      goes into our token service for in-memory use).
 *   5. Sign out of Firebase locally — we don't need its session, just the
 *      one-shot identity proof. Keeps Firebase from leaving cached state
 *      that could mismatch our own session.
 *
 * Throws on:
 *   - User closed the popup or denied permission.
 *   - Firebase client not configured (missing NEXT_PUBLIC_FIREBASE_* vars).
 *   - Backend rejects the token (expired/invalid/revoked).
 *
 * Returns the authenticated user on success.
 */
export async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    const provider = buildGoogleProvider();

    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken(/* forceRefresh */ true);

    // Hand the Firebase token to our backend; receive our own tokens.
    const response = await signInGoogle(idToken);

    // Apply auth state. Mirrors what login()/verifyOtp() do internally.
    if (response.accessToken) {
        setAccessToken(response.accessToken, response.refreshToken);
    }
    setSessionUserId(response.user.id);

    useAuthStore.setState((state) => ({
        auth: {
            ...state.auth,
            user: response.user,
            isLoading: false,
            authStatus: "authenticated",
        },
    }));

    // We're done with Firebase — drop its session so it doesn't keep a
    // stale token alongside our own JWTs.
    try {
        await firebaseSignOut(auth);
    } catch {
        // Non-fatal: Firebase signOut sometimes throws if there's no
        // current user (e.g. after token refresh). Our session is already
        // established at this point, so swallow.
    }

    return response.user;
}
