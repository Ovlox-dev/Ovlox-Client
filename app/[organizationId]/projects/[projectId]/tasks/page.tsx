"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    CheckSquare2,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    Edit,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Users,
    Tag
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

type TaskItem = {
    id: string
    title: string
    description: string
    status: "todo" | "in-progress" | "review" | "done"
    priority: "low" | "medium" | "high"
    assignee?: { name: string; avatar?: string }
    dueDate?: string
    tags?: string[]
    subtasks?: { id: string; title: string; completed: boolean }[]
    progress?: number
}

const sampleTasks: TaskItem[] = [
    {
        id: "1",
        title: "Implement user authentication",
        description: "Set up JWT authentication with refresh tokens",
        status: "in-progress",
        priority: "high",
        assignee: { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        dueDate: "2024-12-08",
        tags: ["backend", "auth"],
        progress: 75,
        subtasks: [
            { id: "1.1", title: "Setup JWT middleware", completed: true },
            { id: "1.2", title: "Add refresh token logic", completed: true },
            { id: "1.3", title: "Add tests", completed: false },
        ]
    },
    {
        id: "2",
        title: "Design dashboard UI",
        description: "Create mockups and high-fidelity designs",
        status: "done",
        priority: "high",
        assignee: { name: "Alice Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
        dueDate: "2024-12-01",
        tags: ["design", "ui"],
        progress: 100,
    },
    {
        id: "3",
        title: "Setup database migrations",
        description: "Create migration scripts for schema changes",
        status: "in-progress",
        priority: "medium",
        assignee: { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
        dueDate: "2024-12-10",
        tags: ["database"],
        progress: 50,
        subtasks: [
            { id: "3.1", title: "Create user table migration", completed: true },
            { id: "3.2", title: "Create project table migration", completed: false },
            { id: "3.3", title: "Add indexes", completed: false },
        ]
    },
    {
        id: "4",
        title: "Write API documentation",
        description: "Document all API endpoints with examples",
        status: "todo",
        priority: "medium",
        dueDate: "2024-12-15",
        tags: ["documentation"],
    },
    {
        id: "5",
        title: "Code review - Frontend PR",
        description: "Review and provide feedback on UI components",
        status: "review",
        priority: "high",
        assignee: { name: "Charlie Brown", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
        dueDate: "2024-12-06",
        tags: ["review", "frontend"],
        progress: 90,
    },
]

export default function Tasks() {
    const [tasks, setTasks] = React.useState<TaskItem[]>(sampleTasks)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [filterStatus, setFilterStatus] = React.useState<string>("all")
    const [filterPriority, setFilterPriority] = React.useState<string>("all")
    const [sortBy, setSortBy] = React.useState<string>("due-date")

    const filteredTasks = React.useMemo(() => {
        let filtered = tasks.filter((task) => {
            const matchesSearch = searchQuery === "" ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = filterStatus === "all" || task.status === filterStatus
            const matchesPriority = filterPriority === "all" || task.priority === filterPriority
            return matchesSearch && matchesStatus && matchesPriority
        })

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === "due-date") {
                if (!a.dueDate) return 1
                if (!b.dueDate) return -1
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            } else if (sortBy === "priority") {
                const priorityOrder = { high: 0, medium: 1, low: 2 }
                return priorityOrder[a.priority] - priorityOrder[b.priority]
            }
            return 0
        })

        return filtered
    }, [tasks, searchQuery, filterStatus, filterPriority, sortBy])

    const getStatusColor = (status: TaskItem["status"]) => {
        switch (status) {
            case "todo":
                return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            case "in-progress":
                return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            case "review":
                return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
            case "done":
                return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
        }
    }

    const getPriorityColor = (priority: TaskItem["priority"]) => {
        switch (priority) {
            case "low":
                return "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
            case "medium":
                return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
            case "high":
                return "text-red-600 bg-red-50 dark:bg-red-900/20"
        }
    }

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === "done").length,
        inProgress: tasks.filter(t => t.status === "in-progress").length,
        overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Tasks</h1>
                    <p className="text-muted-foreground">Manage all project tasks and subtasks</p>
                </div>
                <Button>
                    <Plus className="size-4" />
                    Create Task
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Tasks</p>
                            <p className="text-2xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <CheckSquare2 className="size-8 text-muted-foreground" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold mt-1">{stats.inProgress}</p>
                        </div>
                        <Clock className="size-8 text-blue-600" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold mt-1">{stats.completed}</p>
                        </div>
                        <CheckCircle2 className="size-8 text-green-600" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Overdue</p>
                            <p className="text-2xl font-bold mt-1">{stats.overdue}</p>
                        </div>
                        <AlertCircle className="size-8 text-red-600" />
                    </div>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="due-date">Due Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                    <Card className="p-12">
                        <div className="text-center">
                            <CheckSquare2 className="size-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                    </Card>
                ) : (
                    filteredTasks.map((task) => (
                        <Card key={task.id} className="p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold">{task.title}</h3>
                                        <Badge className={`text-xs capitalize ${getStatusColor(task.status)}`}>
                                            {task.status.replace("-", " ")}
                                        </Badge>
                                        <Badge variant="outline" className={`text-xs capitalize ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreVertical className="size-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-0" align="end">
                                        <Sidebar>
                                            <SidebarContent>
                                                <SidebarGroup>
                                                    <SidebarGroupContent>
                                                        <SidebarMenu>
                                                            <SidebarMenuItem>
                                                                <SidebarMenuButton>
                                                                    <Edit className="size-4" />
                                                                    <span>Edit</span>
                                                                </SidebarMenuButton>
                                                            </SidebarMenuItem>
                                                            <SidebarMenuItem>
                                                                <SidebarMenuButton className="text-destructive">
                                                                    <Trash2 className="size-4" />
                                                                    <span>Delete</span>
                                                                </SidebarMenuButton>
                                                            </SidebarMenuItem>
                                                        </SidebarMenu>
                                                    </SidebarGroupContent>
                                                </SidebarGroup>
                                            </SidebarContent>
                                        </Sidebar>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Progress Bar */}
                            {task.progress !== undefined && (
                                <div className="mb-3">
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{task.progress}% complete</p>
                                </div>
                            )}

                            {/* Subtasks */}
                            {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs font-semibold mb-2">
                                        Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
                                    </p>
                                    <div className="space-y-1">
                                        {task.subtasks.map((subtask) => (
                                            <div key={subtask.id} className="flex items-center gap-2 text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={subtask.completed}
                                                    className="size-3"
                                                    readOnly
                                                />
                                                <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                                                    {subtask.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
                                <div>
                                    {task.assignee ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="size-6">
                                                <AvatarImage src={task.assignee.avatar} />
                                                <AvatarFallback className="text-xs">
                                                    {task.assignee.name.split(" ").map(n => n[0]).join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                    )}
                                </div>
                                {task.dueDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="size-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {task.tags && task.tags.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap col-span-2 md:col-span-1">
                                        {task.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
