"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
    CheckSquare2,
    Plus,
    Search,
    Trash2,
    Loader2,
    Calendar,
    UserPlus,
    Link2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    type Task,
    type TaskPriority,
    type TaskStatus,
    useAssignTask,
    useCreateTask,
    useDeleteTask,
    useLinkRawEventToTask,
    useListTasks,
    useUpdateTaskStatus,
} from "@/entities/task";
import { listMembers } from "@/entities/organization/api/org";

const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
    { value: "TODO", label: "To Do", color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
    { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    { value: "REVIEW", label: "Review", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
    { value: "DONE", label: "Done", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
    { value: "BLOCKED", label: "Blocked", color: "bg-red-500/15 text-red-600 border-red-500/30" },
    { value: "CANCELLED", label: "Cancelled", color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30" },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: "LOW", label: "Low", color: "text-slate-500" },
    { value: "MEDIUM", label: "Medium", color: "text-blue-500" },
    { value: "HIGH", label: "High", color: "text-orange-500" },
    { value: "URGENT", label: "Urgent", color: "text-red-500" },
];

function statusMeta(s: TaskStatus) {
    return STATUSES.find((x) => x.value === s) ?? STATUSES[0];
}

export function ProjectTasksPage() {
    const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
    const [statusFilter, setStatusFilter] = React.useState<"all" | TaskStatus>("all");
    const [keyword, setKeyword] = React.useState("");

    const { data: tasksResponse, isLoading } = useListTasks(organizationId, projectId, {
        status: statusFilter === "all" ? undefined : statusFilter,
        keyword: keyword || undefined,
        limit: 100,
    });

    const tasks = tasksResponse?.tasks ?? [];

    return (
        <div className="p-4 md:p-6 space-y-4">
            <header className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
                        <CheckSquare2 className="size-6" /> Tasks
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manual + auto-detected tasks for this project.
                    </p>
                </div>
                <CreateTaskDialog organizationId={organizationId} projectId={projectId} />
            </header>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-50 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks…"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | TaskStatus)}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : tasks.length === 0 ? (
                <Card className="p-12 text-center">
                    <CheckSquare2 className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                        No tasks yet. Create one or wait for auto-detection from ingested events.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-2">
                    {tasks.map((task) => (
                        <TaskRow key={task.id} task={task} organizationId={organizationId} projectId={projectId} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CreateTaskDialog({ organizationId, projectId }: { organizationId: string; projectId: string }) {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM");
    const { mutate, isPending } = useCreateTask(organizationId, projectId);

    const handleCreate = () => {
        if (!title.trim()) { return; }
        mutate(
            { title: title.trim(), description: description.trim() || undefined, priority },
            {
                onSuccess: () => {
                    setTitle("");
                    setDescription("");
                    setPriority("MEDIUM");
                    setOpen(false);
                    toast.success("Task created");
                },
                onError: (err) => toast.error("Create failed", { description: (err as Error).message }),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="size-4" /> New task</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create task</DialogTitle>
                    <DialogDescription>Add a new task to this project.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
                        {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TaskRow({ task, organizationId, projectId }: { task: Task; organizationId: string; projectId: string }) {
    const [linkOpen, setLinkOpen] = React.useState(false);
    const updateStatus = useUpdateTaskStatus(organizationId, projectId, task.id);
    const deleteTask = useDeleteTask(organizationId, projectId);
    const meta = statusMeta(task.status);

    return (
        <Card className="p-3 flex items-center gap-3 flex-wrap">
            <Select
                value={task.status}
                onValueChange={(v) =>
                    updateStatus.mutate(v as TaskStatus, {
                        onError: (err) => toast.error("Status update failed", { description: (err as Error).message }),
                    })
                }
            >
                <SelectTrigger className={cn("w-32 h-8 text-xs", meta.color)}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{task.title}</p>
                {task.description ? (
                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                ) : null}
            </div>

            {task.priority ? (
                <Badge variant="outline" className="text-xs">
                    {task.priority}
                </Badge>
            ) : null}

            {task.dueDate ? (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(task.dueDate).toLocaleDateString()}
                </span>
            ) : null}

            {task.source === "AUTO_DETECTED" ? (
                <Badge variant="outline" className="text-[10px]">auto</Badge>
            ) : null}

            <AssigneePopover task={task} organizationId={organizationId} projectId={projectId} />

            <Button
                variant="ghost"
                size="icon-sm"
                title="Link to a raw event"
                onClick={() => setLinkOpen(true)}
            >
                <Link2 className="size-4" />
            </Button>
            <LinkEventDialog open={linkOpen} onOpenChange={setLinkOpen} organizationId={organizationId} projectId={projectId} taskId={task.id} />

            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                    if (typeof window !== "undefined" && !window.confirm(`Delete task "${task.title}"?`)) { return; }
                    deleteTask.mutate(task.id, {
                        onSuccess: () => toast.success("Task deleted"),
                        onError: (err) => toast.error("Delete failed", { description: (err as Error).message }),
                    });
                }}
            >
                <Trash2 className="size-4 text-destructive" />
            </Button>
        </Card>
    );
}

type OrgMember = {
    id: string;
    userId?: string;
    user?: { id?: string; firstName?: string | null; lastName?: string | null; email?: string | null };
};

function AssigneePopover({ task, organizationId, projectId }: { task: Task; organizationId: string; projectId: string }) {
    const [open, setOpen] = React.useState(false);
    const [members, setMembers] = React.useState<OrgMember[]>([]);
    const [loading, setLoading] = React.useState(false);
    const assign = useAssignTask(organizationId, projectId, task.id);

    React.useEffect(() => {
        if (!open || members.length > 0) { return; }
        setLoading(true);
        listMembers(organizationId, { limit: 100 })
            .then((res) => setMembers((res.data ?? []) as OrgMember[]))
            .catch((err) => toast.error("Failed to load members", { description: (err as Error).message }))
            .finally(() => setLoading(false));
    }, [open, members.length, organizationId]);

    const assignedIds = new Set((task.assignments ?? []).map((a) => a.memberId));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8">
                    <UserPlus className="size-3.5" />
                    <span className="text-xs">{(task.assignments?.length ?? 0)}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">Assign to</p>
                {loading ? (
                    <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin" /></div>
                ) : members.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No members</p>
                ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {members.map((m) => {
                            const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(" ") || m.user?.email || "Member";
                            const isAssigned = assignedIds.has(m.id);
                            return (
                                <button
                                    key={m.id}
                                    onClick={() =>
                                        assign.mutate({ assigneeId: m.id }, {
                                            onSuccess: () => {
                                                toast.success(`Assigned ${name}`);
                                                setOpen(false);
                                            },
                                            onError: (err) => toast.error("Assign failed", { description: (err as Error).message }),
                                        })
                                    }
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between hover:bg-muted transition-colors",
                                        isAssigned ? "text-text" : "text-muted-foreground",
                                    )}
                                >
                                    <span className="truncate">{name}</span>
                                    {isAssigned ? <Badge variant="outline" className="text-[10px]">assigned</Badge> : null}
                                </button>
                            );
                        })}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function LinkEventDialog({
    open,
    onOpenChange,
    organizationId,
    projectId,
    taskId,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    organizationId: string;
    projectId: string;
    taskId: string;
}) {
    const [rawEventId, setRawEventId] = React.useState("");
    const [relationship, setRelationship] = React.useState<"MENTIONED" | "PROGRESS" | "COMPLETED" | "BLOCKED" | "RELATED">("RELATED");
    const link = useLinkRawEventToTask(organizationId, projectId, taskId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link to raw event</DialogTitle>
                    <DialogDescription>
                        Connect a commit, message, or issue to this task. Paste the raw event ID — find it in the Events tab.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder="Raw event ID (UUID)"
                        value={rawEventId}
                        onChange={(e) => setRawEventId(e.target.value)}
                    />
                    <Select value={relationship} onValueChange={(v) => setRelationship(v as typeof relationship)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MENTIONED">Mentioned</SelectItem>
                            <SelectItem value="PROGRESS">Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="BLOCKED">Blocked</SelectItem>
                            <SelectItem value="RELATED">Related</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() =>
                            link.mutate({ rawEventId: rawEventId.trim(), relationship }, {
                                onSuccess: () => {
                                    toast.success("Event linked");
                                    setRawEventId("");
                                    onOpenChange(false);
                                },
                                onError: (err) => toast.error("Link failed", { description: (err as Error).message }),
                            })
                        }
                        disabled={!rawEventId.trim() || link.isPending}
                    >
                        {link.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
