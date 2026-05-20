import { SESSION_USER_ID_KEY } from "../storage-keys";

function canUseStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setSessionUserId(userId: string | null | undefined): void {
    if (!canUseStorage()) { return; }
    if (userId) {
        window.localStorage.setItem(SESSION_USER_ID_KEY, userId);
        return;
    }
    window.localStorage.removeItem(SESSION_USER_ID_KEY);
}

export function getSessionUserId(): string | null {
    if (!canUseStorage()) { return null; }
    return window.localStorage.getItem(SESSION_USER_ID_KEY);
}

export function clearSessionStorage(): void {
    if (!canUseStorage()) { return; }
    window.localStorage.removeItem(SESSION_USER_ID_KEY);
}
