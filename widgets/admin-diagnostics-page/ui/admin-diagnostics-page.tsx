"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useBootstrapOpenAiModels, useOpenAiDiagnostics } from "@/entities/admin";
import { useApiError } from "@/hooks/useApiError";

export function AdminDiagnosticsPage() {
    const diagnosticsQuery = useOpenAiDiagnostics();
    const bootstrap = useBootstrapOpenAiModels();
    useApiError(diagnosticsQuery.error);

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <Activity className="size-6" /> Diagnostics
                </h1>
                <p className="text-muted-foreground text-sm">
                    Verify the LLM stack is healthy. Use this when chat or processRawEvent silently falls back.
                </p>
            </header>

            <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="font-semibold">OpenAI health check</h2>
                        <p className="text-xs text-muted-foreground">
                            API key + LlmModel rows + a real 1-token chat completion ping.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => diagnosticsQuery.refetch()}
                        disabled={diagnosticsQuery.isFetching}
                    >
                        {diagnosticsQuery.isFetching ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="size-4 mr-2" />
                        )}
                        Run checks
                    </Button>
                </div>

                {diagnosticsQuery.isPending ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                ) : diagnosticsQuery.data ? (
                    <ul className="space-y-2">
                        {diagnosticsQuery.data.checks.map((c) => (
                            <li key={c.name} className="flex items-start gap-3 p-2 rounded-md border border-border">
                                {c.ok ? (
                                    <CheckCircle2 className="size-4 mt-0.5 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{c.name}</p>
                                    {c.detail && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {c.detail}
                                        </p>
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${c.ok ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}
                                >
                                    {c.ok ? "ok" : "fail"}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </Card>

            <Card className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <Database className="size-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold">Re-seed OpenAI model catalogue</h3>
                        <p className="text-sm text-muted-foreground">
                            If the LlmModel table is empty or the diagnostics show no active OpenAI rows,
                            seed the default catalogue (gpt-4o-mini, gpt-4o, gpt-4, gpt-3.5-turbo, embeddings).
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() =>
                            bootstrap.mutate(
                                { overwriteExisting: false },
                                { onSuccess: () => toast.success("Seeded missing models") },
                            )
                        }
                        disabled={bootstrap.isPending}
                    >
                        Seed missing
                    </Button>
                    <Button
                        onClick={() =>
                            bootstrap.mutate(
                                { overwriteExisting: true },
                                { onSuccess: () => toast.success("Re-seeded all models") },
                            )
                        }
                        disabled={bootstrap.isPending}
                    >
                        {bootstrap.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                        Overwrite + re-seed
                    </Button>
                </div>
            </Card>
        </div>
    );
}
