"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Send,
    Plus,
    Search,
    Phone,
    Video,
    MoreVertical,
    Paperclip,
    Smile,
    Settings,
    Users,
    Hash,
    MessageSquare
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

type Message = {
    id: string
    author: { name: string; avatar?: string }
    content: string
    timestamp: Date
    reactions?: { emoji: string; count: number }[]
}

type Channel = {
    id: string
    name: string
    type: "public" | "direct"
    unread: number
    members?: number
    lastMessage?: string
    lastMessageTime?: Date
}

const channels: Channel[] = [
    { id: "1", name: "general", type: "public", unread: 0, members: 12, lastMessage: "Check out the new design", lastMessageTime: new Date(Date.now() - 300000) },
    { id: "2", name: "frontend", type: "public", unread: 3, members: 5, lastMessage: "Component review completed", lastMessageTime: new Date(Date.now() - 600000) },
    { id: "3", name: "backend", type: "public", unread: 0, members: 4, lastMessage: "API endpoints ready", lastMessageTime: new Date(Date.now() - 1800000) },
    { id: "4", name: "design", type: "public", unread: 1, members: 3, lastMessage: "Mockups uploaded", lastMessageTime: new Date(Date.now() - 3600000) },
    { id: "5", name: "John Doe", type: "direct", unread: 2, lastMessage: "Can you review my PR?", lastMessageTime: new Date(Date.now() - 900000) },
    { id: "6", name: "Jane Smith", type: "direct", unread: 0, lastMessage: "Thanks for the update!", lastMessageTime: new Date(Date.now() - 5400000) },
]

const messages: Message[] = [
    {
        id: "1",
        author: { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        content: "Hey team! Check out the new design components I just pushed",
        timestamp: new Date(Date.now() - 3600000),
        reactions: [{ emoji: "👍", count: 3 }, { emoji: "🚀", count: 1 }]
    },
    {
        id: "2",
        author: { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
        content: "Looks great! I'll start integrating them into the main layout",
        timestamp: new Date(Date.now() - 3400000),
    },
    {
        id: "3",
        author: { name: "Bob Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
        content: "The UI looks really polished! Any breaking changes I should know about?",
        timestamp: new Date(Date.now() - 3200000),
    },
    {
        id: "4",
        author: { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        content: "Nope, fully backward compatible! You can update whenever you're ready",
        timestamp: new Date(Date.now() - 3000000),
    },
    {
        id: "5",
        author: { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
        content: "Perfect! Merging to main now 🎉",
        timestamp: new Date(Date.now() - 2800000),
        reactions: [{ emoji: "🎉", count: 4 }]
    },
]

export default function Chat() {
    const [selectedChannel, setSelectedChannel] = React.useState<Channel>(channels[0])
    const [messageInput, setMessageInput] = React.useState("")
    const [searchQuery, setSearchQuery] = React.useState("")
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const filteredChannels = React.useMemo(() => {
        if (!searchQuery) return channels
        return channels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [searchQuery])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [])

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            console.log("Sending message:", messageInput)
            setMessageInput("")
        }
    }

    const formatTime = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)

        if (hours > 24) {
            return date.toLocaleDateString()
        } else if (hours > 0) {
            return `${hours}h ago`
        } else if (minutes > 0) {
            return `${minutes}m ago`
        }
        return "now"
    }

    return (
        <div className="flex h-[calc(100vh-80px)] bg-background">
            {/* Sidebar - Channels */}
            <div className="w-64 border-r border-border flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="font-bold text-lg">Messages</h1>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Plus className="size-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                        <Input
                            placeholder="Search channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-8 text-sm"
                        />
                    </div>
                </div>

                {/* Channels List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2">
                        {/* Public Channels */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">CHANNELS</p>
                            {filteredChannels.filter(ch => ch.type === "public").map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannel(channel)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-start justify-between gap-2 ${selectedChannel.id === channel.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                        }`}
                                >
                                    <span className="flex items-center gap-2 flex-1 min-w-0">
                                        <Hash className="size-4 shrink-0" />
                                        <span className="truncate text-sm font-medium">{channel.name}</span>
                                    </span>
                                    {channel.unread > 0 && (
                                        <Badge variant="destructive" className="text-xs shrink-0">
                                            {channel.unread}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Direct Messages */}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">DIRECT MESSAGES</p>
                            {filteredChannels.filter(ch => ch.type === "direct").map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannel(channel)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-center justify-between gap-2 ${selectedChannel.id === channel.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                        }`}
                                >
                                    <span className="flex items-center gap-2 flex-1 min-w-0">
                                        <Avatar className="size-6 shrink-0">
                                            <AvatarFallback className="text-xs">
                                                {channel.name.split(" ").map(n => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate text-sm font-medium">{channel.name}</span>
                                    </span>
                                    {channel.unread > 0 && (
                                        <Badge variant="destructive" className="text-xs shrink-0">
                                            {channel.unread}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="border-b border-border p-4 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            {selectedChannel.type === "direct" ? (
                                <>
                                    <Avatar className="size-6">
                                        <AvatarFallback className="text-xs">
                                            {selectedChannel.name.split(" ").map(n => n[0]).join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    {selectedChannel.name}
                                </>
                            ) : (
                                <>
                                    <Hash className="size-5" />
                                    {selectedChannel.name}
                                </>
                            )}
                        </h2>
                        {selectedChannel.members && (
                            <p className="text-xs text-muted-foreground mt-1">{selectedChannel.members} members</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Phone className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Video className="size-4" />
                        </Button>
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
                                                            <Settings className="size-4" />
                                                            <span>Settings</span>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                    <SidebarMenuItem>
                                                        <SidebarMenuButton>
                                                            <Users className="size-4" />
                                                            <span>Members</span>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                    <SidebarMenuItem>
                                                        <SidebarMenuButton>
                                                            <MessageSquare className="size-4" />
                                                            <span>Notifications</span>
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
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className="flex gap-3 group">
                            <Avatar className="size-8 mt-1 shrink-0">
                                <AvatarImage src={message.author.avatar} />
                                <AvatarFallback className="text-xs">
                                    {message.author.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <p className="font-semibold text-sm">{message.author.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</p>
                                </div>
                                <p className="text-sm text-foreground wrap-break-word mb-2">{message.content}</p>
                                {message.reactions && message.reactions.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {message.reactions.map((reaction) => (
                                            <button
                                                key={reaction.emoji}
                                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
                                            >
                                                <span>{reaction.emoji}</span>
                                                <span className="text-xs">{reaction.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                                                                <Smile className="size-4" />
                                                                <span>React</span>
                                                            </SidebarMenuButton>
                                                        </SidebarMenuItem>
                                                        <SidebarMenuItem>
                                                            <SidebarMenuButton>
                                                                <MessageSquare className="size-4" />
                                                                <span>Reply</span>
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
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-border p-4">
                    <div className="flex gap-2 items-end">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <Paperclip className="size-4" />
                        </Button>
                        <div className="flex-1">
                            <Input
                                placeholder={`Message ${selectedChannel.type === "direct" ? selectedChannel.name : "#" + selectedChannel.name}`}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage()
                                    }
                                }}
                                className="text-sm"
                            />
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <Smile className="size-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            className="shrink-0"
                        >
                            <Send className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
