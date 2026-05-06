"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Coins, Loader2, AlertCircle, ArrowDownToLine, ArrowUpToLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
    type CreditTransactionType,
    useGrantCredits,
    useListCreditTransactions,
    useOrgCreditBalance,
} from "@/entities/admin";
import { useApiError } from "@/hooks/useApiError";

const TYPE_OPTIONS: CreditTransactionType[] = [
    "BONUS",
    "ADJUSTMENT",
    "REFUND",
    "PURCHASE",
    "SUBSCRIPTION",
];

export function AdminCreditsPage() {
    const { organizationId } = useParams<{ organizationId: string }>();

    const balanceQuery = useOrgCreditBalance(organizationId);
    const txQuery = useListCreditTransactions(organizationId);
    const grant = useGrantCredits(organizationId);

    useApiError(balanceQuery.error);
    useApiError(txQuery.error);

    const [amount, setAmount] = React.useState("");
    const [type, setType] = React.useState<CreditTransactionType>("BONUS");
    const [description, setDescription] = React.useState("");

    const handleGrant = () => {
        const numeric = Number(amount);
        if (!numeric || !description.trim()) {
            toast.error("Amount and description are required");
            return;
        }
        grant.mutate(
            { amount: numeric, type, description: description.trim() },
            {
                onSuccess: (res) => {
                    toast.success(`Granted — new balance ${res.balanceAfter}`);
                    setAmount("");
                    setDescription("");
                },
                onError: (err) =>
                    toast.error("Grant failed", {
                        description: err instanceof Error ? err.message : String(err),
                    }),
            },
        );
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                    <Coins className="size-6" /> Credits
                </h1>
                <p className="text-muted-foreground text-sm">
                    Admin-only. Grant credits without going through Stripe — for self-hosted, demos, or compensating incidents.
                </p>
            </header>

            <Card className="p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Current balance</p>
                    <p className="text-3xl font-bold">
                        {balanceQuery.isPending ? (
                            <Loader2 className="size-6 animate-spin inline" />
                        ) : (
                            balanceQuery.data?.creditBalance ?? "—"
                        )}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => balanceQuery.refetch()}>
                    <RefreshCw className="size-4 mr-2" /> Refresh
                </Button>
            </Card>

            <Card className="p-5 space-y-3">
                <h3 className="font-semibold">Grant credits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="grant-amount">Amount</Label>
                        <Input
                            id="grant-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="grant-type">Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as CreditTransactionType)}>
                            <SelectTrigger id="grant-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPE_OPTIONS.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="grant-desc">Description (audit trail) *</Label>
                    <Textarea
                        id="grant-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Pre-revenue testing seed"
                        rows={2}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleGrant} disabled={grant.isPending}>
                        {grant.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                        Grant
                    </Button>
                </div>
            </Card>

            <Card className="p-5">
                <h3 className="font-semibold mb-3">Transaction history</h3>
                {txQuery.isPending ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                ) : txQuery.error ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        Failed to load transactions
                    </div>
                ) : (txQuery.data?.transactions.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        No transactions yet.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {txQuery.data!.transactions.map((tx) => {
                            const isCredit = !tx.amount.startsWith("-");
                            const Icon = isCredit ? ArrowDownToLine : ArrowUpToLine;
                            return (
                                <li key={tx.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                                    <Icon className={`size-4 mt-0.5 shrink-0 ${isCredit ? "text-emerald-600" : "text-red-600"}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                                            <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        {tx.description && (
                                            <p className="text-sm mt-1">{tx.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {tx.balanceBefore} → {tx.balanceAfter}
                                        </p>
                                    </div>
                                    <div className={`font-mono font-semibold text-sm ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                                        {isCredit ? "+" : ""}{tx.amount}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </div>
    );
}
