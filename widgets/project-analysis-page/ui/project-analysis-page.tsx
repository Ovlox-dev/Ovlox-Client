"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Send,
    Sparkles,
    X,
    MessageCircle,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Minimize2,
    Code,
    CalendarClock,
} from "lucide-react"
import { SiGithub, SiJira, SiSlack, SiDiscord } from "react-icons/si"
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation"
import { getGithubOverview } from "@/entities/github"
import type { GitHubOverview } from "@/types/api-types"
import { useOrg } from "@/entities/organization"
import { useProject } from "@/hooks/useProject"
import { ExternalProvider } from "@/types/enum"
import { toast } from "sonner"

type DataSource = {
    id: string
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    count: number
}

type Summary = {
    id: string
    source: string
    title: string
    type: "update" | "issue" | "success" | "info"
    content: string
    highlights: string[]
    timestamp: Date
    metrics?: { label: string; value: string }[]
}

const dataSources: DataSource[] = [
    { id: "all", name: "All Sources", icon: Sparkles, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950", count: 24 },
    { id: "github", name: "GitHub", icon: SiGithub, color: "text-gray-900 dark:text-gray-100", bgColor: "bg-gray-50 dark:bg-gray-900", count: 8 },
    { id: "jira", name: "Jira", icon: SiJira, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950", count: 5 },
    { id: "slack", name: "Slack", icon: SiSlack, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950", count: 6 },
    { id: "discord", name: "Discord", icon: SiDiscord, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950", count: 3 },
]

const summaries: Summary[] = [
    {
        id: "1",
        source: "github",
        title: "Repository Activity Summary",
        type: "success",
        content: "Significant development progress with 12 new commits across 3 branches. The team merged 2 pull requests focused on frontend improvements and bug fixes.",
        highlights: [
            "12 commits pushed to main branch",
            "2 pull requests merged successfully",
            "3 issues closed (bug fixes)",
            "Code review completion rate: 100%",
        ],
        timestamp: new Date(Date.now() - 1800000),
        metrics: [
            { label: "Commits", value: "12" },
            { label: "PRs", value: "2" },
            { label: "Issues", value: "3" },
        ],
    },
    {
        id: "2",
        source: "jira",
        title: "Sprint Progress Update",
        type: "info",
        content: "Current sprint is 65% complete with 13 out of 20 story points delivered. 2 tasks are at risk of missing the deadline and may need team attention.",
        highlights: [
            "13/20 story points completed",
            "5 tasks in progress",
            "2 tasks at risk (blocked)",
            "Team velocity: +15% vs last sprint",
        ],
        timestamp: new Date(Date.now() - 3600000),
        metrics: [
            { label: "Completed", value: "65%" },
            { label: "At Risk", value: "2" },
            { label: "Velocity", value: "+15%" },
        ],
    },
    {
        id: "3",
        source: "slack",
        title: "Team Communication Insights",
        type: "info",
        content: "Active discussions in #frontend and #backend channels. 23 messages exchanged about the new authentication system implementation.",
        highlights: [
            "23 messages in #frontend channel",
            "Key discussion: Authentication system",
            "3 team members highly active",
            "2 questions need responses",
        ],
        timestamp: new Date(Date.now() - 5400000),
        metrics: [
            { label: "Messages", value: "23" },
            { label: "Active Users", value: "3" },
        ],
    },
    {
        id: "4",
        source: "github",
        title: "Code Quality & Reviews",
        type: "issue",
        content: "1 pull request has been waiting for review for over 48 hours. This may be blocking dependent tasks and requires immediate attention.",
        highlights: [
            "1 PR pending review (48+ hours)",
            "Potential blocker for 2 tasks",
            "Suggested reviewers: @jane, @bob",
            "Priority: High",
        ],
        timestamp: new Date(Date.now() - 7200000),
        metrics: [
            { label: "Pending", value: "1" },
            { label: "Wait Time", value: "48h" },
        ],
    },
    {
        id: "5",
        source: "discord",
        title: "Community Updates",
        type: "update",
        content: "3 new feature requests from the community Discord. Users are requesting dark mode improvements and mobile responsiveness enhancements.",
        highlights: [
            "3 feature requests received",
            "Top request: Dark mode polish",
            "12 community members engaged",
            "2 bug reports submitted",
        ],
        timestamp: new Date(Date.now() - 9000000),
        metrics: [
            { label: "Requests", value: "3" },
            { label: "Engaged", value: "12" },
        ],
    },
    {
        id: "6",
        source: "jira",
        title: "Bug Tracking Overview",
        type: "issue",
        content: "5 critical bugs identified this week. 3 have been resolved, but 2 remain open and are affecting user experience on mobile devices.",
        highlights: [
            "5 critical bugs logged",
            "3 bugs resolved this week",
            "2 bugs still open (mobile UI)",
            "Average resolution time: 2.3 days",
        ],
        timestamp: new Date(Date.now() - 10800000),
        metrics: [
            { label: "Open", value: "2" },
            { label: "Resolved", value: "3" },
        ],
    },
    {
        id: "8",
        source: "slack",
        title: "Stand-up Highlights",
        type: "info",
        content: "Daily stand-up revealed that the authentication module is nearly complete. Testing phase begins next week with focus on security audits.",
        highlights: [
            "Auth module: 90% complete",
            "Testing starts next week",
            "Security audit scheduled",
            "No blockers reported",
        ],
        timestamp: new Date(Date.now() - 14400000),
        metrics: [
            { label: "Progress", value: "90%" },
            { label: "Blockers", value: "0" },
        ],
    },
]

type ChatMessage = {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

export function ProjectAnalysisPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const params = useParams()
    const projectId = params.projectId as string
    const { currentOrg } = useOrg()
    const { loadProject, currentProject } = useProject()
    const [selectedSource, setSelectedSource] = React.useState("all")
    const [githubOverview, setGithubOverview] = React.useState<GitHubOverview | null>(null)
    const [isLoadingGithub, setIsLoadingGithub] = React.useState(true)
    const [chatOpen, setChatOpen] = React.useState(false)
    const [chatMinimized, setChatMinimized] = React.useState(false)
    const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm your AI assistant. Ask me anything about your data sources, summaries, or specific insights you'd like to understand better.",
            timestamp: new Date(),
        },
    ])
    const [chatInput, setChatInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const filteredSummaries = React.useMemo(() => {
        if (selectedSource === "all") { return summaries }
        return summaries.filter(s => s.source === selectedSource)
    }, [selectedSource])

    React.useEffect(() => {
        const source = searchParams.get("source")
        if (source && dataSources.some(s => s.id === source)) {
            setSelectedSource(source)
        } else {
            const params = new URLSearchParams(searchParams)
            params.set("source", "all")
            router.replace(`${pathname}?${params.toString()}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        if (currentOrg?.id && projectId) {
            loadProject(currentOrg.id, projectId as string).catch((err) => {
                toast.error("Failed to load project for analysis", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            })
        }
    }, [currentOrg?.id, projectId, loadProject])

    const githubIntegrationId = React.useMemo(() => {
        const connections = currentProject?.integrations || []
        const githubConnection = connections.find((conn) => conn.integration?.type === ExternalProvider.GITHUB)
        return githubConnection?.integrationId
    }, [currentProject])

    React.useEffect(() => {
        const fetchGithubOverview = async () => {
            try {
                setIsLoadingGithub(true)
                if (!githubIntegrationId) {
                    setGithubOverview(null)
                    return
                }
                const data = await getGithubOverview(githubIntegrationId, projectId)
                setGithubOverview(data)
            } catch (err) {
                toast.error("Failed to fetch GitHub overview:", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            } finally {
                setIsLoadingGithub(false)
            }
        }

        if (projectId) {
            fetchGithubOverview()
        }
    }, [projectId, githubIntegrationId])

    const handleSourceChange = (id: string) => {
        setSelectedSource(id)
        const params = new URLSearchParams(searchParams)
        params.set("source", id)
        router.replace(`${pathname}?${params.toString()}`)
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        if (chatOpen) { scrollToBottom() }
    }, [chatMessages, chatOpen])

    const handleSendMessage = () => {
        if (!chatInput.trim()) { return }

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: chatInput,
            timestamp: new Date(),
        }
        setChatMessages(prev => [...prev, userMessage])
        setChatInput("")
        setIsLoading(true)

        setTimeout(() => {
            const aiResponse: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: "assistant",
                content: `Based on the current analysis data:\n\n• GitHub shows strong development activity with 12 commits\n• Jira indicates 2 tasks at risk in the current sprint\n• There's 1 PR pending review for 48+ hours on GitHub\n• Team communication is active with 23 Slack messages\n\nWould you like me to explain any specific metric or provide recommendations?`,
                timestamp: new Date(),
            }
            setChatMessages(prev => [...prev, aiResponse])
            setIsLoading(false)
        }, 1000)
    }

    const getTypeIcon = (type: Summary["type"]) => {
        switch (type) {
            case "success": return <CheckCircle2 className="size-4 text-green-600" />
            case "issue": return <AlertCircle className="size-4 text-red-600" />
            case "update": return <TrendingUp className="size-4 text-blue-600" />
            default: return <Clock className="size-4 text-gray-600" />
        }
    }

    const getTypeBadge = (type: Summary["type"]) => {
        const variants: Record<Summary["type"], string> = {
            success: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
            issue: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
            update: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
            info: "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
        }
        return variants[type]
    }

    if (isLoadingGithub) {
        return <div>Loading...</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Data Source Analysis</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        AI-generated summaries and insights from all connected sources
                    </p>
                </div>
                <Button onClick={() => setChatOpen(true)} className="gap-2">
                    <Sparkles className="size-4" />
                    Ask AI Assistant
                </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {dataSources.map((source) => {
                    const Icon = source.icon
                    return (
                        <button
                            key={source.id}
                            onClick={() => handleSourceChange(source.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${selectedSource === source.id
                                ? `${source.bgColor} border-current`
                                : "bg-background hover:bg-muted"
                                }`}
                        >
                            <Icon className={`size-4 ${selectedSource === source.id ? source.color : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${selectedSource === source.id ? source.color : "text-foreground"}`}>
                                {source.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                {source.count}
                            </Badge>
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSummaries.map((summary) => {
                    const sourceData = dataSources.find(s => s.id === summary.source)
                    const SourceIcon = sourceData?.icon || FileText
                    const isGithub = summary.source === "github"

                    if (summary.id === "1" && githubOverview) {
                        return (
                            <Card
                                key={summary.id}
                                className="p-5 hover:shadow-xl hover:border-primary/30 transition-all duration-200 border-border/50 cursor-pointer"
                                onClick={() => router.push(`${pathname}/github`)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${sourceData?.bgColor}`}>
                                            <SourceIcon className={`size-4 ${sourceData?.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">Repository Activity Summary</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {githubOverview.repo.name} • {sourceData?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge("success")}`}>
                                        {getTypeIcon("success")}
                                        <span className="capitalize">Live</span>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4">
                                    Active development on <span className="font-medium text-foreground">{githubOverview.repo.name}</span> repository{githubOverview.repo.description && `: ${githubOverview.repo.description}`}
                                </p>

                                <div className="flex gap-4 mb-4 pb-4 border-b">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Commits</p>
                                        <p className="text-lg font-bold">{githubOverview.activity.commits}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">PRs</p>
                                        <p className="text-lg font-bold">{githubOverview.activity.pullRequests}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Issues</p>
                                        <p className="text-lg font-bold">{githubOverview.activity.issues}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <span>⭐</span>
                                        <span>{githubOverview.repo.stars} stars</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>🍴</span>
                                        <span>{githubOverview.repo.forks} forks</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>🌿</span>
                                        <span>{githubOverview.repo.defaultBranch}</span>
                                    </div>
                                </div>
                            </Card>
                        )
                    }

                    if (summary.id === "4") {
                        return (
                            <Card
                                key={summary.id}
                                className="p-5 hover:shadow-xl hover:border-primary/30 transition-all duration-200 border-border/50"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${sourceData?.bgColor}`}>
                                            <SourceIcon className={`size-4 ${sourceData?.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">{summary.title}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Review pending items • {sourceData?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(summary.type)}`}>
                                        {getTypeIcon(summary.type)}
                                        <span className="capitalize">{summary.type}</span>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4">
                                    Review code quality, pending pull requests, and ensure best practices across your repository.
                                </p>

                                <div className="flex flex-col gap-4">
                                    <Button
                                        onClick={() => router.push(`${pathname}/github?tab=prs`)}
                                        className="flex-1 gap-2"
                                        variant="outline"
                                    >
                                        <Code className="size-4" />
                                        Review Now
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            alert("Schedule review functionality coming soon!")
                                        }}
                                        className="flex-1 gap-2"
                                        variant="outline"
                                    >
                                        <CalendarClock className="size-4" />
                                        Schedule Review
                                    </Button>
                                </div>
                            </Card>
                        )
                    }

                    return (
                        <Card
                            key={summary.id}
                            className={`p-5 hover:shadow-xl hover:border-primary/30 transition-all duration-200 border-border/50 ${isGithub ? "cursor-pointer" : ""}`}
                            onClick={isGithub ? () => router.push(`${pathname}/github`) : undefined}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${sourceData?.bgColor}`}>
                                        <SourceIcon className={`size-4 ${sourceData?.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">{summary.title}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {summary.timestamp.toLocaleTimeString()} • {sourceData?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(summary.type)}`}>
                                    {getTypeIcon(summary.type)}
                                    <span className="capitalize">{summary.type}</span>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                {summary.content}
                            </p>

                            {summary.metrics && summary.metrics.length > 0 && (
                                <div className="flex gap-4 mb-4 pb-4 border-b">
                                    {summary.metrics.map((metric, idx) => (
                                        <div key={idx}>
                                            <p className="text-xs text-muted-foreground">{metric.label}</p>
                                            <p className="text-lg font-bold">{metric.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">KEY HIGHLIGHTS</p>
                                <ul className="space-y-1.5">
                                    {summary.highlights.map((highlight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>{highlight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {filteredSummaries.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="size-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No summaries found for this data source</p>
                </div>
            )}

            {chatOpen && (
                <div className={`fixed ${chatMinimized ? "bottom-4 right-4" : "bottom-4 right-4 w-96"} z-50 transition-all`}>
                    {chatMinimized ? (
                        <Button
                            onClick={() => setChatMinimized(false)}
                            size="lg"
                            className="rounded-full size-14 shadow-lg"
                        >
                            <MessageCircle className="size-6" />
                        </Button>
                    ) : (
                        <Card className="flex flex-col h-125 shadow-2xl">
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-lg bg-linear-to-br from-primary to-purple-600 flex items-center justify-center">
                                        <Sparkles className="size-4 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">AI Assistant</p>
                                        <p className="text-xs text-muted-foreground">Always here to help</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setChatMinimized(true)}
                                    >
                                        <Minimize2 className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setChatOpen(false)}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {chatMessages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {message.role === "assistant" && (
                                            <Avatar className="size-7 mt-1 shrink-0">
                                                <div className="size-7 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center">
                                                    <Sparkles className="size-3 text-primary-foreground" />
                                                </div>
                                            </Avatar>
                                        )}
                                        <div className={`max-w-[80%] ${message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-lg p-3"
                                            : "bg-muted rounded-lg p-3"
                                            }`}>
                                            <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                        {message.role === "user" && (
                                            <Avatar className="size-7 mt-1 shrink-0">
                                                <AvatarFallback className="text-xs">You</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-2">
                                        <Avatar className="size-7 mt-1 shrink-0">
                                            <div className="size-7 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center">
                                                <Sparkles className="size-3 text-primary-foreground animate-pulse" />
                                            </div>
                                        </Avatar>
                                        <div className="bg-muted rounded-lg p-3">
                                            <div className="flex gap-1">
                                                <div className="size-1.5 bg-muted-foreground rounded-full animate-bounce" />
                                                <div className="size-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                <div className="size-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="border-t p-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ask about any data source..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSendMessage()
                                            }
                                        }}
                                        className="text-sm"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isLoading}
                                        className="shrink-0"
                                    >
                                        <Send className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}

