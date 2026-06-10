"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Loader2, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useApiError } from "@/hooks/useApiError";
import { useGetProject } from "@/entities/project";
import {
    useListSkillDocuments, useCreateSkillDocument, useUpdateSkillDocument,
    useDeleteSkillDocument, useGenerateProjectOverview, type SkillDocument,
} from "@/entities/skill-documents";

const STATUS_CLS: Record<string, string> = {
    ACTIVE: "bg-green-500/15 text-green-600 border-green-500/30",
    DRAFT: "bg-muted text-muted-foreground",
    ARCHIVED: "bg-orange-500/15 text-orange-600 border-orange-500/30",
};

export function ProjectSkillDocsPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const { data: project } = useGetProject(organizationId, projectId);
    const orgUuid = project?.organizationId ?? organizationId;
    const projectUuid = project?.id ?? projectId;

    const listQuery = useListSkillDocuments(orgUuid, { projectId: projectUuid });
    const createDoc = useCreateSkillDocument(orgUuid);
    const updateDoc = useUpdateSkillDocument(orgUuid);
    const deleteDoc = useDeleteSkillDocument(orgUuid);
    const generate = useGenerateProjectOverview(orgUuid);
    useApiError(listQuery.error);

    const [editing, setEditing] = React.useState<SkillDocument | "new" | null>(null);

    const handleGenerate = () => {
        generate.mutate(
            { projectId: projectUuid },
            {
                onSuccess: () => toast.success("Overview generation started — it will appear shortly."),
                onError: () => toast.error("Failed to start overview generation."),
            },
        );
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <BookOpen className="size-6" /> Skill documents
                    </h1>
                    <p className="text-muted-foreground text-sm">Curated and AI-generated knowledge the assistant uses to answer questions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleGenerate} disabled={generate.isPending}>
                        {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        Generate overview
                    </Button>
                    <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New</Button>
                </div>
            </header>

            {listQuery.isPending ? (
                <div className="flex items-center gap-2 text-sm text-(--fg-3) p-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>
            ) : (listQuery.data?.length ?? 0) === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">No skill documents yet.</Card>
            ) : (
                <div className="space-y-2">
                    {listQuery.data!.map((d) => (
                        <Card key={d.id} className="p-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-(--fg)">{d.title}</span>
                                    <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[d.status] ?? ""}`}>{d.status}</Badge>
                                    <Badge variant="outline" className="text-[10px]">{d.scope}</Badge>
                                    {d.generatedByLlm ? <Badge variant="outline" className="text-[10px]">AI</Badge> : null}
                                </div>
                                {d.summary ? <p className="text-xs text-muted-foreground line-clamp-2">{d.summary}</p> : null}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="size-4" /></Button>
                            <Button
                                size="sm" variant="ghost" disabled={deleteDoc.isPending}
                                onClick={() => deleteDoc.mutate(d.id, { onSuccess: () => toast.success("Deleted") })}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {editing ? (
                <SkillDocEditor
                    doc={editing === "new" ? null : editing}
                    saving={createDoc.isPending || updateDoc.isPending}
                    onClose={() => setEditing(null)}
                    onSave={(values) => {
                        if (editing === "new") {
                            createDoc.mutate(
                                { ...values, scope: "PROJECT", projectId: projectUuid },
                                { onSuccess: () => { toast.success("Created"); setEditing(null); }, onError: () => toast.error("Failed to create") },
                            );
                        } else {
                            updateDoc.mutate(
                                { id: editing.id, body: values },
                                { onSuccess: () => { toast.success("Saved"); setEditing(null); }, onError: () => toast.error("Failed to save") },
                            );
                        }
                    }}
                />
            ) : null}
        </div>
    );
}

function SkillDocEditor({
    doc, saving, onClose, onSave,
}: {
    doc: SkillDocument | null;
    saving: boolean;
    onClose: () => void;
    onSave: (values: { title: string; summary?: string; body: string }) => void;
}) {
    const [title, setTitle] = React.useState(doc?.title ?? "");
    const [summary, setSummary] = React.useState(doc?.summary ?? "");
    const [body, setBody] = React.useState(doc?.body ?? "");

    return (
        <Dialog open onOpenChange={(o) => { if (!o) { onClose(); } }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{doc ? "Edit document" : "New document"}</DialogTitle>
                    <DialogDescription>Project-scoped knowledge. Active documents are embedded for retrieval.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input placeholder="Summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
                    <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[240px] font-mono text-sm" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button
                        onClick={() => onSave({ title, summary: summary || undefined, body })}
                        disabled={saving || !title.trim() || !body.trim()}
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
