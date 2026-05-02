"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Check, X, Inbox, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    type Writeback,
    type WritebackActionStatus,
    useApproveWriteback,
    useListWritebacks,
    useRejectWriteback,
} from "@/entities/writeback";

const STATUSES: { value: "all" | WritebackActionStatus; label: string }[] = [
    { value: "PENDING_APPROVAL", label: "Pending" },
    { value: "all", label: "All" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "EXECUTED", label: "Executed" },
    { value: "FAILED", label: "Failed" },
];

const STATUS_COLOR: Record<WritebackActionStatus, string> = {
    PENDING_APPROVAL: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    APPROVED: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    REJECTED: "bg-red-500/15 text-red-600 border-red-500/30",
    EXECUTING: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    EXECUTED: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    FAILED: "bg-red-500/15 text-red-600 border-red-500/30",
    CANCELLED: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

const RISK_COLOR = {
    LOW: "text-emerald-600",
    MEDIUM: "text-amber-600",
    HIGH: "text-red-600",
} as const;

export function WritebacksPage() {
    const { organizationId } = useParams<{ organizationId: string }>();
    const [status, setStatus] = React.useState<"all" | WritebackActionStatus>("PENDING_APPROVAL");
    const [active, setActive] = React.useState<Writeback | null>(null);

    const { data, isLoading } = useListWritebacks(organizationId, {
        status: status === "all" ? undefined : status,
        limit: 100,
    });

    const items = data ?? [];

    return (
        <div className="p-4 md:p-6 space-y-4">
            <header className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <Inbox className="size-6" /> Writeback approvals
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        AI-suggested actions awaiting human review — PR comments, ticket creation, Slack messages.
                    </p>
                </div>
                <Select value={status} onValueChange={(v) => setStatus(v as "all" | WritebackActionStatus)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <Card className="p-12 text-center">
                    <Inbox className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No writebacks for this filter.</p>
                </Card>
            ) : (
                <div className="grid gap-2">
                    {items.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => setActive(w)}
                            className="text-left"
                        >
                            <Card className="p-3 flex items-center gap-3 hover:bg-card/80 transition-colors">
                                <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_COLOR[w.status])}>
                                    {w.status.replace(/_/g, " ")}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] shrink-0">{w.actionType.replace(/_/g, " ")}</Badge>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {w.targetProvider ?? "—"}
                                        {w.targetExternalId ? <span className="text-muted-foreground"> · {w.targetExternalId}</span> : null}
                                    </p>
                                    {w.reasoning ? (
                                        <p className="text-xs text-muted-foreground truncate">{w.reasoning}</p>
                                    ) : null}
                                </div>
                                {w.riskLevel ? (
                                    <span className={cn("text-xs font-medium hidden sm:inline", RISK_COLOR[w.riskLevel])}>
                                        {w.riskLevel}
                                    </span>
                                ) : null}
                                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </Card>
                        </button>
                    ))}
                </div>
            )}

            <WritebackDetail
                writeback={active}
                organizationId={organizationId}
                onClose={() => setActive(null)}
            />
        </div>
    );
}

function WritebackDetail({
    writeback,
    organizationId,
    onClose,
}: {
    writeback: Writeback | null;
    organizationId: string;
    onClose: () => void;
}) {
    const [rejectNote, setRejectNote] = React.useState("");
    const approve = useApproveWriteback(organizationId);
    const reject = useRejectWriteback(organizationId);

    React.useEffect(() => {
        if (!writeback) { setRejectNote(""); }
    }, [writeback]);

    if (!writeback) { return null; }
    const canReview = writeback.status === "PENDING_APPROVAL";

    return (
        <Dialog open={!!writeback} onOpenChange={(o) => { if (!o) { onClose(); } }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_COLOR[writeback.status])}>
                            {writeback.status.replace(/_/g, " ")}
                        </Badge>
                        {writeback.actionType.replace(/_/g, " ")}
                    </DialogTitle>
                    <DialogDescription>
                        {writeback.targetProvider ?? "—"} · {writeback.targetExternalId ?? "no target id"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {writeback.reasoning ? (
                        <section>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Reasoning</p>
                            <p className="text-sm whitespace-pre-wrap wrap-break-word">{writeback.reasoning}</p>
                        </section>
                    ) : null}

                    {writeback.payload ? (
                        <section>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Payload</p>
                            <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                                {JSON.stringify(writeback.payload, null, 2)}
                            </pre>
                        </section>
                    ) : null}

                    {writeback.failureReason ? (
                        <section>
                            <p className="text-xs font-semibold text-destructive uppercase mb-1">Failure</p>
                            <p className="text-sm text-destructive whitespace-pre-wrap wrap-break-word">{writeback.failureReason}</p>
                        </section>
                    ) : null}

                    {writeback.rejectionNote ? (
                        <section>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Rejection note</p>
                            <p className="text-sm whitespace-pre-wrap wrap-break-word">{writeback.rejectionNote}</p>
                        </section>
                    ) : null}
                </div>

                {canReview ? (
                    <>
                        <Input
                            placeholder="Rejection note (optional)"
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                        />
                        <DialogFooter>
                            <Button
                                variant="destructive"
                                onClick={() =>
                                    reject.mutate({ writebackId: writeback.id, note: rejectNote || undefined }, {
                                        onSuccess: () => { toast.success("Rejected"); onClose(); },
                                        onError: (err) => toast.error("Reject failed", { description: (err as Error).message }),
                                    })
                                }
                                disabled={reject.isPending || approve.isPending}
                            >
                                {reject.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <X className="size-4 mr-2" />}
                                Reject
                            </Button>
                            <Button
                                onClick={() =>
                                    approve.mutate(writeback.id, {
                                        onSuccess: () => { toast.success("Approved — queued for execution"); onClose(); },
                                        onError: (err) => toast.error("Approve failed", { description: (err as Error).message }),
                                    })
                                }
                                disabled={reject.isPending || approve.isPending}
                            >
                                {approve.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
                                Approve
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose}>Close</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
