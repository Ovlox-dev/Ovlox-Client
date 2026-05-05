"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
    AlertCircle,
    CheckCircle2,
    GitCommit,
    GitPullRequest,
    AlertTriangle,
    Shield,
    Code,
    Bug,
    ArrowLeft,
} from "lucide-react"
import { SiGithub } from "react-icons/si"
import {
    CustomModal,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalClose,
    CustomModalBody,
    CustomModalFooter,
} from "@/components/ui/custom-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation"
import {
    getGithubCommits,
    getGithubCommitDetails,
    type GitHubCommitSummary,
    type GitHubCommitDetail,
    debugGithubCommit,
    type DebugGithubCommitResponse,
    getGithubPullRequests,
    getGithubIssues,
    type GitHubPullRequest,
    type GitHubIssue,
} from "@/entities/github"
import { useOrg } from "@/entities/organization"
import { useProject } from "@/hooks/useProject"
import { ExternalProvider } from "@/types/enum"
import { llmMarkdownToHtml } from "@/lib/llm-format"
import { DiffViewer } from "@/components/diff-viewer"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type CommitSummary = GitHubCommitSummary

type CommitDetail = GitHubCommitDetail

export function ProjectAnalysisGithubPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const params = useParams()
    const projectId = params.projectId as string
    const { currentOrg } = useOrg()
    const { loadProject, currentProject } = useProject()
    const [selectedCategory, setSelectedCategory] = React.useState<"commits" | "prs" | "issues">("commits")
    const [commits, setCommits] = React.useState<CommitSummary[]>([])
    const [commitDetail, setCommitDetail] = React.useState<CommitDetail | null>(null)
    const [selectedCommit, setSelectedCommit] = React.useState<CommitSummary | null>(null)
    const [isLoadingCommits, setIsLoadingCommits] = React.useState(true)
    const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
    const [showDiffModal, setShowDiffModal] = React.useState(false)
    const [showDebugModal, setShowDebugModal] = React.useState(false)
    const [summaryHtml, setSummaryHtml] = React.useState<string | null>(null)
    const [debugResult, setDebugResult] = React.useState<DebugGithubCommitResponse | null>(null)
    const [isDebugLoading, setIsDebugLoading] = React.useState(false)
    const [debugHtml, setDebugHtml] = React.useState<string | null>(null)
    const [repositories] = React.useState<Array<{ full_name: string; name: string }>>([])
    const [selectedRepoFullName, setSelectedRepoFullName] = React.useState<string>("")

    const [pullRequests, setPullRequests] = React.useState<GitHubPullRequest[]>([])
    const [issues, setIssues] = React.useState<GitHubIssue[]>([])
    const [isLoadingPRs, setIsLoadingPRs] = React.useState(false)
    const [isLoadingIssues, setIsLoadingIssues] = React.useState(false)
    const [selectedPullRequest, setSelectedPullRequest] = React.useState<GitHubPullRequest | null>(null)
    const [selectedIssue, setSelectedIssue] = React.useState<GitHubIssue | null>(null)

    React.useEffect(() => {
        const tab = searchParams.get("tab")
        if (tab === "commits" || tab === "prs" || tab === "issues") {
            setSelectedCategory(tab as "commits" | "prs" | "issues")
        } else {
            const params = new URLSearchParams(searchParams)
            params.set("tab", "commits")
            router.replace(`${pathname}?${params.toString()}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        if (currentOrg?.id && projectId) {
            loadProject(currentOrg.id, projectId as string).catch((err) => {
                toast.error("Failed to load project for GitHub analysis", {
                    description: err.message,
                })
            })
        }
    }, [currentOrg?.id, projectId, loadProject])

    const githubIntegrationId = React.useMemo(() => {
        const connections = currentProject?.integrations || []
        const githubConnection = connections.find((conn) => {
            const provider = conn.integration?.type
            const status = conn.integration?.status

            return (
                provider === ExternalProvider.GITHUB &&
                (status === "CONNECTED" || !status)
            )
        })
        return githubConnection?.integrationId
    }, [currentProject])

    React.useEffect(() => {
        const loadCommits = async () => {
            if (!githubIntegrationId) {
                setCommits([])
                return
            }
            try {
                setIsLoadingCommits(true)
                const data = await getGithubCommits(githubIntegrationId)
                setCommits(data)
            } catch (err) {
                toast.error("Failed to load GitHub commits", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
                setCommits([])
            } finally {
                setIsLoadingCommits(false)
            }
        }

        loadCommits()
    }, [githubIntegrationId])

    React.useEffect(() => {
        const loadPRsAndIssues = async () => {
            if (!githubIntegrationId || !selectedRepoFullName) {
                setPullRequests([])
                setIssues([])
                return
            }

            try {
                setIsLoadingPRs(true)
                setIsLoadingIssues(true)
                const [prs, iss] = await Promise.all([
                    getGithubPullRequests(githubIntegrationId, { repoFullName: selectedRepoFullName, state: "open", limit: 50 }),
                    getGithubIssues(githubIntegrationId, { repoFullName: selectedRepoFullName, state: "open", limit: 50 }),
                ])
                setPullRequests(prs)
                setIssues(iss)
            } catch (err) {
                toast.error("Failed to load GitHub PRs/issues", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
                setPullRequests([])
                setIssues([])
            } finally {
                setIsLoadingPRs(false)
                setIsLoadingIssues(false)
            }
        }

        void loadPRsAndIssues()
    }, [githubIntegrationId, selectedRepoFullName])

    const handleTabChange = (val: string) => {
        setSelectedCategory(val as "commits" | "prs" | "issues")
        setSelectedCommit(null)
        setCommitDetail(null)
        setSelectedPullRequest(null)
        setSelectedIssue(null)
        const params = new URLSearchParams(searchParams)
        params.set("tab", val)
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleDebug = async () => {
        if (!commitDetail || !githubIntegrationId) { return }

        try {
            setIsDebugLoading(true)
            const res = await debugGithubCommit(githubIntegrationId, commitDetail.commit.sha)
            setDebugResult(res)
            const html = await llmMarkdownToHtml(res.explanation)
            setDebugHtml(html)
            setShowDebugModal(true)
        } finally {
            setIsDebugLoading(false)
        }
    }

    const handleSelectCommit = async (commit: CommitSummary) => {
        if (!githubIntegrationId) { return }
        setSelectedCommit(commit)
        setCommitDetail(null)
        try {
            setIsLoadingDetail(true)
            const detail = await getGithubCommitDetails(githubIntegrationId, commit.sha)
            setCommitDetail(detail)
            setSummaryHtml(await llmMarkdownToHtml(detail.aiSummary))
        } catch (error) {
            toast.error("Failed to load commit detail", {
                description: error instanceof Error ? error.message : "Unknown error",
            })
            setCommitDetail(null)
        } finally {
            setIsLoadingDetail(false)
        }
    }

    const getSecurityBadge = (level: string) => {
        const normalized = level.toLowerCase()
        switch (normalized) {
            case "none":
                return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">No Risks</Badge>
            case "low":
                return <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Low Risk</Badge>
            case "medium":
                return <Badge variant="default" className="bg-orange-500/20 text-orange-400 border-orange-500/30">Medium Risk</Badge>
            case "high":
                return <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/30">High Risk</Badge>
            default:
                return <Badge variant="secondary" className="border-border">{level}</Badge>
        }
    }

    const getQualityColor = (score: number) => {
        if (score >= 90) { return "text-green-400" }
        if (score >= 75) { return "text-yellow-400" }
        return "text-orange-400"
    }

    const renderCommitDetail = (detail: CommitDetail, summary: CommitSummary | null) => (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <GitCommit className="size-5 text-muted-foreground" />
                    <div>
                        <h3 className="font-semibold text-lg">{detail.commit.message}</h3>
                        <p className="text-sm text-muted-foreground">
                            {detail.commit.sha} • {detail.commit?.date && new Date(detail.commit.date).toLocaleString()}
                        </p>
                    </div>
                </div>
                {summary && (
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{summary.filesChanged} files</span>
                        <span className="text-green-400">+{summary.additions}</span>
                        <span className="text-red-400">-{summary.deletions}</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                    <Code className="size-4" />
                    AI Summary
                </h4>
                {summaryHtml && (
                    <div
                        className="prose prose-sm max-w-none text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: summaryHtml }}
                    />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-4" />
                        Code Quality
                    </h4>

                    {!detail.codeQuality ? (
                        <div className="text-sm text-muted-foreground italic">
                            Code quality analysis not available for this commit.
                        </div>
                    ) : (
                        <>
                            <div className="text-sm text-muted-foreground mb-2">
                                {detail.codeQuality.summary}
                            </div>

                            {detail.codeQuality.score !== null && (
                                <div className={`font-semibold ${getQualityColor(detail.codeQuality.score)}`}>
                                    Score: {detail.codeQuality.score}/100
                                </div>
                            )}

                            {detail.codeQuality.issues.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs">
                                    {detail.codeQuality.issues.map((issue, idx) => (
                                        <li key={idx} className="flex gap-2">
                                            <AlertTriangle className="size-3 mt-0.5" />
                                            <span>
                                                <b>{issue.type}</b> ({issue.severity}): {issue.description}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </Card>

                <Card className="p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                        <Shield className="size-4" />
                        Security
                    </h4>

                    <div className="mb-2">
                        {getSecurityBadge(detail.security.risk)}
                    </div>

                    <div className="text-xs text-muted-foreground mb-2">
                        {detail.security.summary}
                    </div>

                    {detail.security.findings.length > 0 && (
                        <ul className="space-y-1 text-xs">
                            {detail.security.findings.map((f, idx) => (
                                <li key={idx} className="flex gap-2">
                                    <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                                    <span>
                                        <b>{f.type}</b> ({f.severity})
                                        {f.file && <> in <code>{f.file}</code></>} — {f.description}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            {detail.canDebug && (
                <Button
                    onClick={handleDebug}
                    className="w-full text-white bg-red-500 hover:bg-red-600"
                >
                    <Bug className="size-4 mr-2" />
                    {isDebugLoading ? "AI Debugging..." : "AI Debug and Fix"}
                </Button>
            )}

            <div>
                <Button onClick={() => setShowDiffModal(true)} variant="outline" className="w-full">
                    <Code className="size-4 mr-2" />
                    View Code Changes ({detail.files.length} files)
                </Button>
            </div>
        </div>
    )

    const renderPRDetail = (pr: GitHubPullRequest) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-lg truncate">{pr.title}</div>
                <Badge variant="outline" className="text-xs">
                    {pr.state.toUpperCase()}
                </Badge>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{pr.aiSummary}</div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>#{pr.number}</span>
                <span>•</span>
                <span>{pr.commits} commits</span>
                <span>•</span>
                <span>{pr.filesChanged} files</span>
                <span>•</span>
                <span className="text-green-400">+{pr.additions}</span>
                <span className="text-red-400">-{pr.deletions}</span>
            </div>
        </div>
    )

    const renderIssueDetail = (issue: GitHubIssue) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-lg truncate">{issue.title}</div>
                <Badge variant="outline" className="text-xs">
                    {issue.state.toUpperCase()}
                </Badge>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.aiAnalysis}</div>
            {issue.suggestedFix ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-xs font-semibold mb-1">Suggested fix</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.suggestedFix}</div>
                </div>
            ) : null}
        </div>
    )

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-border">
                        <SiGithub className="size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">GitHub Analysis</h1>
                        <p className="text-sm text-muted-foreground">
                            AI-powered insights for commits, pull requests, and issues
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={selectedCategory} onValueChange={handleTabChange}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="text-sm text-muted-foreground">Repository</div>
                    <div className="min-w-[280px]">
                        <Select value={selectedRepoFullName} onValueChange={(v) => setSelectedRepoFullName(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select repository" />
                            </SelectTrigger>
                            <SelectContent>
                                {repositories.map((r) => (
                                    <SelectItem key={r.full_name} value={r.full_name}>
                                        {r.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <TabsList className="grid w-full max-w-xl grid-cols-3">
                    <TabsTrigger value="commits" className="flex items-center gap-2">
                        <GitCommit className="size-4" />
                        <span>Commits</span>
                        <Badge variant="outline" className="ml-1 text-xs">{commits.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="prs" className="flex items-center gap-2">
                        <GitPullRequest className="size-4" />
                        <span>Pull Requests</span>
                        <Badge variant="outline" className="ml-1 text-xs">{pullRequests.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="issues" className="flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        <span>Issues</span>
                        <Badge variant="outline" className="ml-1 text-xs">{issues.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6 space-y-6">
                    <TabsContent value="commits" className="mt-0 space-y-3">
                        {selectedCommit ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setSelectedCommit(null)
                                        setCommitDetail(null)
                                    }}>
                                        <ArrowLeft className="size-4 mr-2" />
                                        Back
                                    </Button>
                                    <h2 className="text-xl font-semibold truncate">{selectedCommit.message}</h2>
                                </div>
                                <Card className="p-6 border-border/50 shadow-xl">
                                    {isLoadingDetail ? (
                                        <div className="space-y-3 animate-pulse">
                                            <div className="h-4 w-3/4 bg-muted rounded" />
                                            <div className="h-4 w-1/2 bg-muted rounded" />
                                            <div className="h-32 bg-muted rounded" />
                                        </div>
                                    ) : commitDetail ? (
                                        renderCommitDetail(commitDetail, selectedCommit)
                                    ) : null}
                                </Card>
                            </div>
                        ) : isLoadingCommits ? (
                            <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 w-3/4 bg-muted rounded" />
                                    <div className="h-4 w-1/2 bg-muted rounded" />
                                    <div className="h-32 bg-muted rounded" />
                                </div>
                            </Card>
                        ) : commits.length === 0 ? (
                            <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                                <GitCommit className="size-4" />
                                No commits found
                            </Card>
                        ) : (
                            commits.map((commit) => (
                                <Card
                                    key={commit.sha}
                                    className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                                    onClick={() => handleSelectCommit(commit)}
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="size-10 border-2 border-border">
                                            {commit.authorAvatar && commit.authorUsername && (
                                                <AvatarImage src={commit.authorAvatar} alt={commit.authorUsername} />
                                            )}
                                            <AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-500 text-white">
                                                {commit.author ? commit.author[0] : "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{commit.message}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {commit.author} • {commit.sha}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                <span className="text-muted-foreground">{commit.filesChanged} files</span>
                                                <span className="text-green-400">+{commit.additions}</span>
                                                <span className="text-red-400">-{commit.deletions}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="prs" className="mt-0 space-y-3">
                        {selectedPullRequest ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedPullRequest(null)}
                                    >
                                        <ArrowLeft className="size-4 mr-2" />
                                        Back
                                    </Button>
                                    <h2 className="text-xl font-semibold truncate">{selectedPullRequest.title}</h2>
                                </div>
                                <Card className="p-6 border-border/50 shadow-xl">
                                    {renderPRDetail(selectedPullRequest)}
                                </Card>
                            </div>
                        ) : isLoadingPRs ? (
                            <Card className="p-6 text-sm text-muted-foreground">
                                Loading pull requests...
                            </Card>
                        ) : pullRequests.length === 0 ? (
                            <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                                <GitPullRequest className="size-4" />
                                No pull requests found
                            </Card>
                        ) : (
                            pullRequests.map((pr) => (
                                <Card
                                    key={String(pr.id)}
                                    className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                                    onClick={() => setSelectedPullRequest(pr)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{pr.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                #{pr.number} • {pr.merged ? "Merged" : pr.state}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                            {pr.state.toUpperCase()}
                                        </Badge>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="issues" className="mt-0 space-y-3">
                        {selectedIssue ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedIssue(null)}
                                    >
                                        <ArrowLeft className="size-4 mr-2" />
                                        Back
                                    </Button>
                                    <h2 className="text-xl font-semibold truncate">{selectedIssue.title}</h2>
                                </div>
                                <Card className="p-6 border-border/50 shadow-xl">
                                    {renderIssueDetail(selectedIssue)}
                                </Card>
                            </div>
                        ) : isLoadingIssues ? (
                            <Card className="p-6 text-sm text-muted-foreground">
                                Loading issues...
                            </Card>
                        ) : issues.length === 0 ? (
                            <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="size-4" />
                                No issues found
                            </Card>
                        ) : (
                            issues.map((issue) => (
                                <Card
                                    key={String(issue.number)}
                                    className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                                    onClick={() => setSelectedIssue(issue)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{issue.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                #{issue.number} • {issue.state}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                            {issue.state.toUpperCase()}
                                        </Badge>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </div>
            </Tabs>

            <CustomModal open={showDiffModal} onOpenChange={setShowDiffModal} maxWidth="5xl">
                <CustomModalHeader>
                    <div className="flex-1">
                        <CustomModalTitle>Code Changes</CustomModalTitle>
                        <CustomModalDescription>
                            Review the code changes in this commit
                        </CustomModalDescription>
                    </div>
                    <CustomModalClose onClose={() => setShowDiffModal(false)} />
                </CustomModalHeader>
                <CustomModalBody className="max-h-[70vh]">
                    {commitDetail && commitDetail.files ? (
                        <div className="space-y-4">
                            {commitDetail.files.map((file, idx) => (
                                <div key={idx} className="border border-border rounded-lg overflow-hidden shadow-lg">
                                    <div className="bg-muted/50 px-4 py-3 font-mono text-sm font-medium border-b border-border flex items-center gap-2">
                                        <Code className="size-4 text-primary" />
                                        {file.filename}
                                    </div>
                                    <div className="bg-card/50">
                                        {file.patch && <DiffViewer patch={file.patch} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">No code changes available</div>
                    )}
                </CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setShowDiffModal(false)}>
                        Close
                    </Button>
                </CustomModalFooter>
            </CustomModal>

            <CustomModal open={showDebugModal} onOpenChange={setShowDebugModal} maxWidth="5xl">
                <CustomModalHeader>
                    <div className="flex-1">
                        <CustomModalTitle className="flex items-center gap-2">
                            <Bug className="size-5 text-primary" />
                            AI-Generated Debug Code
                        </CustomModalTitle>
                        <CustomModalDescription>
                            Review and commit the suggested fix
                        </CustomModalDescription>
                    </div>
                    <CustomModalClose onClose={() => setShowDebugModal(false)} />
                </CustomModalHeader>
                <CustomModalBody className="max-h-[70vh] space-y-4">
                    {isDebugLoading ? (
                        <div className="animate-pulse h-32 bg-muted rounded" />
                    ) : debugResult ? (
                        <>
                            <div className="flex items-center gap-3">
                                <Badge
                                    className={
                                        debugResult.risk === "high"
                                            ? "bg-red-500/20 text-red-400"
                                            : debugResult.risk === "medium"
                                                ? "bg-orange-500/20 text-orange-400"
                                                : "bg-green-500/20 text-green-400"
                                    }
                                >
                                    {debugResult.risk.toUpperCase()} RISK
                                </Badge>

                                {debugResult.safeToApply ? (
                                    <Badge className="bg-green-500/20 text-green-400">
                                        Safe to apply
                                    </Badge>
                                ) : (
                                    <Badge className="bg-red-500/20 text-red-400">
                                        Manual review required
                                    </Badge>
                                )}

                                <span className="text-xs text-muted-foreground">
                                    Confidence: {Math.round(debugResult.confidence * 100)}%
                                </span>
                            </div>

                            <div>
                                <h4 className="font-medium mb-1">Explanation</h4>

                                {debugHtml ? (
                                    <div
                                        className="prose prose-sm max-w-none text-sm"
                                        dangerouslySetInnerHTML={{ __html: debugHtml }}
                                    />
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        No debug suggestions available
                                    </div>
                                )}
                            </div>

                            {debugResult.suggestedCode && (
                                <div>
                                    <h4 className="font-medium mb-1">Suggested Code</h4>
                                    <pre className="text-xs font-mono bg-muted/40 p-3 rounded overflow-x-auto">
                                        {debugResult.suggestedCode}
                                    </pre>
                                </div>
                            )}

                            {debugResult.patches && debugResult.patches.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">Proposed Patches</h4>
                                    {debugResult.patches.map((p, idx) => (
                                        <div key={idx} className="border rounded">
                                            <div className="bg-muted px-3 py-1 text-xs font-mono">
                                                {p.filename}
                                            </div>
                                            <DiffViewer patch={p.diff} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No debug suggestions available
                        </div>
                    )}
                </CustomModalBody>
                <CustomModalFooter>
                    <Button variant="outline" onClick={() => setShowDebugModal(false)}>
                        Cancel
                    </Button>

                    <Button
                        disabled={!debugResult?.safeToApply}
                        className="bg-linear-to-r from-green-500 to-emerald-500 disabled:opacity-50"
                        onClick={() => {
                            alert("Code will be committed to GitHub")
                            setShowDebugModal(false)
                        }}
                    >
                        <GitCommit className="size-4 mr-2" />
                        Commit Fix to GitHub
                    </Button>
                </CustomModalFooter>
            </CustomModal>
        </div>
    )
}

