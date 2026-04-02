"use client"

import * as React from "react"
    import { SiSlack } from "react-icons/si"


export default function SlackIntegrationPage() {
    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-border">
                        <SiSlack className="size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Slack Integration</h1>
                        <p className="text-sm text-muted-foreground">Connect Slack and manage channels.</p>
                    </div>
                </div>
            </div>

        </div>
    )
}

