/**
 * Thin compatibility layer around the canonical Firebase client config in
 * `lib/firebase.ts`. Existing callers (e.g. google-signin.ts) imported from
 * this path before the config was hard-coded; we keep the same surface so
 * nothing downstream has to change.
 */

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import {
    firebaseApp,
    firebaseAuth,
    buildGoogleProvider as buildProvider,
} from "@/lib/firebase";

export function getFirebaseApp(): FirebaseApp {
    return firebaseApp;
}

export function getFirebaseAuth(): Auth {
    return firebaseAuth;
}

export const buildGoogleProvider = buildProvider;
