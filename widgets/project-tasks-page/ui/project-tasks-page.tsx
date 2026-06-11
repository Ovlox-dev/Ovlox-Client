"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
    CheckSquare2,
    Plus,
    Search,
    Trash2,
    Loader2,
    UserPlus,
    Link2,
    Calendar,
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
    useUpdateTask,
    useUpdateTaskStatus,
} from "@/entities/task";

import { listProjectMembers } from "@/entities/project/api/projects";

const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
    { value: "TODO", label: "To Do", color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
    { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    { value: "REVIEW", label: "Review", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
    { value: "DONE", label: "Done", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
    { value: "BLOCKED", label: "Blocked", color: "bg-red-500/15 text-red-600 border-red-500/30" },
    { value: "CANCELLED", label: "Cancelled", color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30" },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
    { value: 1, label: "Low", color: "text-slate-500" },
    { value: 3, label: "Medium", color: "text-blue-500" },
    { value: 4, label: "High", color: "text-orange-500" },
    { value: 5, label: "Urgent", color: "text-red-500" },
];

function statusMeta(s: TaskStatus) {
    return STATUSES.find((x) => x.value === s) ?? STATUSES[0];
}

function priorityMeta(p: TaskPriority) {
    return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];
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
                    <p className="text-(--fg-2) text-sm">
                        Manual + auto-detected tasks for this project.
                    </p>
                </div>
                <CreateTaskDialog organizationId={organizationId} projectId={projectId} />
            </header>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-50 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-(--fg-2)" />
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
                <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-(--fg-2)" /></div>
            ) : tasks.length === 0 ? (
                <Card className="p-12 text-center">
                    <CheckSquare2 className="size-10 mx-auto mb-3 text-(--fg-2) opacity-50" />
                    <p className="text-sm text-(--fg-2)">
                        No tasks yet. Create one or wait for auto-detection from ingested events.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-3 gap-2">
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
    const [status, setStatus] = React.useState<TaskStatus>("TODO");
    const [priority, setPriority] = React.useState<TaskPriority>(3);
    const [dueDate, setDueDate] = React.useState("");
    const { mutate, isPending } = useCreateTask(organizationId, projectId);

    const handleCreate = () => {
        if (!title.trim()) { return; }
        mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
                status,
                priority,
                dueDate: dueDate.trim() || undefined,
            },
            {
                onSuccess: () => {
                    setTitle("");
                    setDescription("");
                    setStatus("TODO");
                    setPriority(3);
                    setDueDate("");
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
                    <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v) as TaskPriority)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        placeholder="Due date (optional)"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
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
    const [dueOpen, setDueOpen] = React.useState(false);
    const [dueDraft, setDueDraft] = React.useState<string>(() => (task.dueDate ? String(task.dueDate).slice(0, 10) : ""));
    const updateStatus = useUpdateTaskStatus(organizationId, projectId, task.id);
    const updateTask = useUpdateTask(organizationId, projectId, task.id);
    const deleteTask = useDeleteTask(organizationId, projectId);
    const meta = statusMeta(task.status);
    const priority = task.priority ? priorityMeta(task.priority) : null;
    const assignees = (task.assignedTo ?? []).filter((a) => a?.isActive !== false);
    const dueText = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;

    return (
        <Card className="p-4 border-border/60 hover:border-border hover:bg-accent-contrast/30 transition-colors">
            <div className=" flex justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-text truncate">{task.title}</p>
                        {task.provider ? (
                            <Badge variant="outline" className="shrink-0 text-[10px] h-5 px-2 uppercase tracking-wide">
                                {task.provider}{task.providerId ? ` · ${task.providerId}` : ""}
                            </Badge>
                        ) : null}
                    </div>
                    {task.description ? (
                        <p className="text-xs text-(--fg-2)">
                            {task.description}
                        </p>
                    ) : null}
                </div>
                <Select
                    value={task.status}
                    onValueChange={(v) =>
                        updateStatus.mutate(v as TaskStatus, {
                            onError: (err) => toast.error("Status update failed", { description: (err as Error).message }),
                        })
                    }
                >
                    <SelectTrigger className={cn("w-32 h-8 text-xs shrink-0", meta.color)}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>


            <div className="flex flex-wrap items-center justify-between gap-1.5">
                {assignees.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <p className="text-xs text-(--fg-2)">Assigned to</p>
                        <p className="text-xs text-text truncate">
                            {assignees.map((a) => a.name).filter(Boolean).join(", ")}
                        </p>
                    </div>
                ) : null}
                <div className="flex items-center gap-2">
                    {dueText ? (
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs text-(--fg-2)">Due</p>
                            <p className="text-xs text-text">{dueText}</p>
                        </div>
                    ) : (
                        <p className="text-xs text-(--fg-2)">No due date</p>
                    )}

                    <Popover open={dueOpen} onOpenChange={setDueOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-1"
                                title="Update due date"
                                onClick={() => setDueDraft(task.dueDate ? String(task.dueDate).slice(0, 10) : "")}
                            >
                                <Calendar className="size-3.5" />
                                <span className="text-xs">Due</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="end">
                            <p className="text-xs font-semibold text-(--fg-2) px-1 mb-2">Due date</p>
                            <Input
                                type="date"
                                value={dueDraft}
                                onChange={(e) => setDueDraft(e.target.value)}
                                className="h-9"
                            />
                            <div className="mt-2 flex items-center justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setDueOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                        updateTask.mutate(
                                            { dueDate: dueDraft.trim() ? dueDraft.trim() : null },
                                            {
                                                onSuccess: () => {
                                                    toast.success("Due date updated")
                                                    setDueOpen(false)
                                                },
                                                onError: (err) => toast.error("Update failed", { description: (err as Error).message }),
                                            },
                                        )
                                    }}
                                    disabled={updateTask.isPending}
                                >
                                    {updateTask.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                    Save
                                </Button>
                            </div>
                            {task.dueDate ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-8 w-full justify-start text-destructive"
                                    onClick={() => {
                                        updateTask.mutate(
                                            { dueDate: null },
                                            {
                                                onSuccess: () => {
                                                    toast.success("Due date cleared")
                                                    setDueOpen(false)
                                                },
                                                onError: (err) => toast.error("Update failed", { description: (err as Error).message }),
                                            },
                                        )
                                    }}
                                    disabled={updateTask.isPending}
                                >
                                    Clear due date
                                </Button>
                            ) : null}
                        </PopoverContent>
                    </Popover>

                    <AssigneePopover task={task} organizationId={organizationId} projectId={projectId} />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                    {priority ? (
                        <Badge
                            variant="outline"
                            className={cn("text-[11px] h-5 px-2", priority.color)}
                        >
                            {priority.label}
                        </Badge>
                    ) : null}

                    {task.source === "AUTO_DETECTED" ? (
                        <Badge variant="outline" className="text-[11px] h-5 px-2">
                            auto
                        </Badge>
                    ) : task.source === "MANUAL" ? (
                        <Badge variant="outline" className="text-[11px] h-5 px-2">
                            manual
                        </Badge>
                    ) : null}
                </div>
                <div>
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
                        title="Delete task"
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
                </div>
            </div>
        </Card>
    );
}

type ProjectMemberItem = {
    id: string;
    user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

function AssigneePopover({ task, organizationId, projectId }: { task: Task; organizationId: string; projectId: string }) {
    const [open, setOpen] = React.useState(false);
    const [members, setMembers] = React.useState<ProjectMemberItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const assign = useAssignTask(organizationId, projectId, task.id);

    React.useEffect(() => {
        if (!open || members.length > 0) { return; }
        setLoading(true);
        listProjectMembers(organizationId, projectId)
            .then((res) => setMembers((res ?? []) as unknown as ProjectMemberItem[]))
            .catch((err) => toast.error("Failed to load project members", { description: (err as Error).message }))
            .finally(() => setLoading(false));
    }, [open, members.length, organizationId, projectId]);

    const assignedIds = new Set(
        (task.assignedTo ?? []).filter((a) => a?.isActive !== false).map((a) => a.assigneeId),
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8">
                    <UserPlus className="size-3.5" />
                    <span className="text-xs">
                        {assignedIds.size}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs font-semibold text-(--fg-2) px-2 mb-1">Assign to</p>
                {loading ? (
                    <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin" /></div>
                ) : members.length === 0 ? (
                    <p className="text-xs text-(--fg-2) p-2">No members</p>
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
                                        isAssigned ? "text-text" : "text-(--fg-2)",
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