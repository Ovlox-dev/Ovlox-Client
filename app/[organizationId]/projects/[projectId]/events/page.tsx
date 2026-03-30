"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    Plus,
    Search,
    Filter,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    Edit,
    Trash2,
    Share2
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

type Event = {
    id: string
    title: string
    description: string
    date: string
    startTime: string
    endTime: string
    location?: string
    type: "meeting" | "deadline" | "review" | "planning"
    attendees: { name: string; avatar?: string }[]
    status: "scheduled" | "ongoing" | "completed" | "cancelled"
}

const sampleEvents: Event[] = [
    {
        id: "1",
        title: "Sprint Planning",
        description: "Plan tasks for the upcoming sprint",
        date: "2024-12-06",
        startTime: "10:00",
        endTime: "11:30",
        location: "Meeting Room A",
        type: "planning",
        attendees: [
            { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
            { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
            { name: "Bob Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
        ],
        status: "scheduled"
    },
    {
        id: "2",
        title: "Design Review",
        description: "Review UI/UX designs for the new features",
        date: "2024-12-06",
        startTime: "14:00",
        endTime: "15:00",
        type: "review",
        attendees: [
            { name: "Alice Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
            { name: "Charlie Brown", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
        ],
        status: "scheduled"
    },
    {
        id: "3",
        title: "Backend API Meeting",
        description: "Discuss API architecture and endpoints",
        date: "2024-12-07",
        startTime: "09:00",
        endTime: "10:00",
        location: "Online - Zoom",
        type: "meeting",
        attendees: [
            { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
            { name: "Bob Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
        ],
        status: "scheduled"
    },
    {
        id: "4",
        title: "Feature Deadline",
        description: "Complete authentication implementation",
        date: "2024-12-10",
        startTime: "17:00",
        endTime: "17:00",
        type: "deadline",
        attendees: [
            { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        ],
        status: "scheduled"
    },
    {
        id: "5",
        title: "Code Review - Frontend",
        description: "Review pull requests for frontend components",
        date: "2024-12-08",
        startTime: "15:30",
        endTime: "16:30",
        type: "review",
        attendees: [
            { name: "Alice Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
            { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        ],
        status: "scheduled"
    },
]

export default function Events() {
    const [events, setEvents] = React.useState<Event[]>(sampleEvents)
    const [filterType, setFilterType] = React.useState<string>("all")
    const [filterStatus, setFilterStatus] = React.useState<string>("all")
    const [searchQuery, setSearchQuery] = React.useState("")

    const filteredEvents = React.useMemo(() => {
        return events.filter((event) => {
            const matchesSearch = searchQuery === "" ||
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.description.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = filterType === "all" || event.type === filterType
            const matchesStatus = filterStatus === "all" || event.status === filterStatus
            return matchesSearch && matchesType && matchesStatus
        })
    }, [events, searchQuery, filterType, filterStatus])

    const getEventColor = (type: Event["type"]) => {
        switch (type) {
            case "meeting":
                return "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
            case "deadline":
                return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
            case "review":
                return "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
            case "planning":
                return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
        }
    }

    const getStatusBadge = (status: Event["status"]) => {
        switch (status) {
            case "scheduled":
                return <Badge variant="outline">Scheduled</Badge>
            case "ongoing":
                return <Badge className="bg-blue-600">Ongoing</Badge>
            case "completed":
                return <Badge className="bg-green-600">Completed</Badge>
            case "cancelled":
                return <Badge variant="destructive">Cancelled</Badge>
        }
    }

    const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length
    const completedEvents = events.filter(e => e.status === "completed").length

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Events</h1>
                    <p className="text-muted-foreground">Manage project meetings, deadlines, and reviews</p>
                </div>
                <Button>
                    <Plus className="size-4" />
                    Create Event
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Events</p>
                            <p className="text-2xl font-bold mt-1">{events.length}</p>
                        </div>
                        <Calendar className="size-8 text-muted-foreground" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Upcoming</p>
                            <p className="text-2xl font-bold mt-1">{upcomingEvents}</p>
                        </div>
                        <Clock className="size-8 text-blue-600" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold mt-1">{completedEvents}</p>
                        </div>
                        <CheckCircle2 className="size-8 text-green-600" />
                    </div>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="meeting">Meetings</SelectItem>
                        <SelectItem value="deadline">Deadlines</SelectItem>
                        <SelectItem value="review">Reviews</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Events List */}
            <div className="space-y-3">
                {filteredEvents.length === 0 ? (
                    <Card className="p-12">
                        <div className="text-center">
                            <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No events found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                    </Card>
                ) : (
                    filteredEvents.map((event) => (
                        <Card key={event.id} className={`p-5 border-l-4 ${getEventColor(event.type)}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold">{event.title}</h3>
                                        {getStatusBadge(event.status)}
                                        <Badge variant="outline" className="capitalize">
                                            {event.type}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{event.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="size-4 text-muted-foreground" />
                                            {new Date(event.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="size-4 text-muted-foreground" />
                                            {event.startTime} - {event.endTime}
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="size-4 text-muted-foreground" />
                                                {event.location}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-muted-foreground">Attendees:</p>
                                        <div className="flex items-center gap-1">
                                            {event.attendees.slice(0, 3).map((attendee, idx) => (
                                                <Avatar key={idx} className="size-6 border-2 border-background">
                                                    <AvatarImage src={attendee.avatar} />
                                                    <AvatarFallback className="text-xs">
                                                        {attendee.name.split(" ").map(n => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {event.attendees.length > 3 && (
                                                <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold border-2 border-background">
                                                    +{event.attendees.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                                                <SidebarMenuButton>
                                                                    <Share2 className="size-4" />
                                                                    <span>Share</span>
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
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
