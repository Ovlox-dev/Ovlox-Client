import * as React from "react";

/**
 * Shell wrapper for auth pages — provides the v3 aurora backdrop and
 * ensures a dark, full-viewport canvas. Form components render inside.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen w-full bg-(--bg) overflow-hidden">
            <div className="aurora" aria-hidden="true" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
