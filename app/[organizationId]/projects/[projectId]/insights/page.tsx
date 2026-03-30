"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    BarChart3,
    TrendingUp,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    Filter,
    Download,
    Calendar,
    Activity,
    GitBranch,
    Plus,
    PieChart as PieChartIcon
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts"

type TimeRange = "week" | "month" | "quarter"

// Sample data
const taskCompletionData = [
    { day: "Mon", completed: 4, pending: 6, inProgress: 3 },
    { day: "Tue", completed: 6, pending: 4, inProgress: 2 },
    { day: "Wed", completed: 8, pending: 3, inProgress: 2 },
    { day: "Thu", completed: 5, pending: 7, inProgress: 3 },
    { day: "Fri", completed: 9, pending: 2, inProgress: 1 },
    { day: "Sat", completed: 3, pending: 4, inProgress: 2 },
    { day: "Sun", completed: 2, pending: 5, inProgress: 3 },
]

const teamProductivityData = [
    { name: "John Doe", tasks: 24, completed: 18 },
    { name: "Jane Smith", tasks: 22, completed: 19 },
    { name: "Bob Wilson", tasks: 18, completed: 14 },
    { name: "Alice Johnson", tasks: 20, completed: 16 },
    { name: "Charlie Brown", tasks: 16, completed: 13 },
]

const statusDistribution = [
    { name: "Completed", value: 45, color: "#10b981" },
    { name: "In Progress", value: 25, color: "#3b82f6" },
    { name: "To Do", value: 20, color: "#8b5cf6" },
    { name: "In Review", value: 10, color: "#f59e0b" },
]

const commitActivityData = [
    { date: "Dec 1", commits: 12 },
    { date: "Dec 2", commits: 19 },
    { date: "Dec 3", commits: 15 },
    { date: "Dec 4", commits: 22 },
    { date: "Dec 5", commits: 18 },
    { date: "Dec 6", commits: 25 },
]

export default function Insights() {
    const [timeRange, setTimeRange] = React.useState<TimeRange>("week")

    const stats = {
        totalTasks: 100,
        completedTasks: 45,
        activeTasks: 35,
        overdueTasks: 8,
        completionRate: 45,
        avgCompletionTime: "3.5 days",
        teamVelocity: "+12%",
        commits: 111,
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Insights</h1>
                    <p className="text-muted-foreground">Project analytics and performance metrics</p>
                </div>
                <div className="flex gap-2">
                    <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                        <SelectTrigger className="w-[140px]">
                            <Calendar className="size-4 mr-2" />
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="quarter">This Quarter</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                        <Download className="size-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <TrendingUp className="size-4 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold">{stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        <span className="text-green-600">+5%</span> vs last week
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Team Velocity</p>
                        <Activity className="size-4 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold">{stats.teamVelocity}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Tasks completed per day
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                        <Clock className="size-4 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold">{stats.avgCompletionTime}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Average time to complete
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Commits</p>
                        <GitBranch className="size-4 text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold">{stats.commits}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Total commits this week
                    </p>
                </Card>
            </div>

            {/* Task Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Task Completion Trend</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={taskCompletionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                            <Line type="monotone" dataKey="pending" stroke="#8b5cf6" strokeWidth={2} />
                            <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Task Status Distribution</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name} (${value})`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Team Productivity & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Team Productivity</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={teamProductivityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="tasks" fill="#3b82f6" />
                                <Bar dataKey="completed" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Task Summary</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-green-600" />
                                <span className="text-sm">Completed</span>
                            </div>
                            <span className="font-semibold">{stats.completedTasks}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Activity className="size-4 text-blue-600" />
                                <span className="text-sm">Active</span>
                            </div>
                            <span className="font-semibold">{stats.activeTasks}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-red-600" />
                                <span className="text-sm">Overdue</span>
                            </div>
                            <span className="font-semibold text-red-600">{stats.overdueTasks}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="size-4 text-purple-600" />
                                <span className="text-sm">Total</span>
                            </div>
                            <span className="font-semibold">{stats.totalTasks}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Commit Activity */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Commit Activity</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={commitActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="commits" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Performance Notes */}
            <Card className="p-6 bg-muted/50">
                <h2 className="text-lg font-semibold mb-3">Performance Summary</h2>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Team is on track with <strong>45%</strong> completion rate, up 5% from last week</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">!</span>
                        <span><strong>8 tasks</strong> are currently overdue and need attention</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">ℹ</span>
                        <span>Average task completion time is <strong>3.5 days</strong>, target is 3 days</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">+</span>
                        <span>Commits trending upward with <strong>111 commits</strong> this week</span>
                    </li>
                </ul>
            </Card>
        </div>
    )
}
