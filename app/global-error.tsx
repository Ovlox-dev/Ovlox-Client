"use client";

import * as React from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    React.useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("[global-error-boundary]", error);
    }, [error]);

    return (
        <html lang="en" className="dark">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0a0a0a",
                    color: "#e5e7eb",
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    padding: "24px",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "28rem",
                        borderRadius: "1rem",
                        border: "1px solid #27272a",
                        backgroundColor: "#111111",
                        padding: "2rem",
                        textAlign: "center",
                    }}
                >
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
                        Something went wrong
                    </h1>
                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#9ca3af",
                        }}
                    >
                        A critical error occurred. Please try again.
                    </p>
                    <button
                        type="button"
                        onClick={() => reset()}
                        style={{
                            marginTop: "1.5rem",
                            padding: "0.5rem 1rem",
                            borderRadius: "9999px",
                            border: "none",
                            backgroundColor: "rgba(200,255,62,0.8)",
                            color: "#000000",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
