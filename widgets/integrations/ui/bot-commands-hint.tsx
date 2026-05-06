"use client";

import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const COMMANDS = [
    { cmd: "/ovlox ask <question>", desc: "Ask anything about your project — answers grounded in real activity" },
    { cmd: "/ovlox status", desc: "Live project health snapshot" },
    { cmd: "/ovlox tasks", desc: "Your pending tasks across linked projects" },
    { cmd: "/ovlox create-task <title>", desc: "Create an internal task; auto-mirrors to Jira/Linear if connected" },
];

export function BotCommandsHint({ provider }: { provider: "slack" | "discord" }) {
    const platform = provider === "slack" ? "Slack" : "Discord";
    return (
        <Card className="p-4 mt-4 bg-muted/40 border-dashed">
            <div className="flex items-start gap-3">
                <Sparkles className="size-4 mt-0.5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">
                        Bot commands available in {platform}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                        Now that you've connected {platform}, your team can run these slash commands directly inside any channel where the Ovlox bot is added.
                    </p>
                    <ul className="space-y-1.5">
                        {COMMANDS.map((c) => (
                            <li key={c.cmd} className="flex items-start gap-2 text-xs">
                                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono shrink-0">
                                    {c.cmd}
                                </code>
                                <span className="text-muted-foreground">— {c.desc}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3">
                        Authorisation: members must have linked their {platform} identity to an Ovlox account; <code>create-task</code> additionally requires the MANAGE_TASKS permission.
                    </p>
                </div>
            </div>
        </Card>
    );
}
