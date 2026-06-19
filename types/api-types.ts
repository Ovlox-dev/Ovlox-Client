import { IUser, IOrganization, IProject, IOrganizationMember, IInvite, IConversation, IChatMessage, IIntegration } from "./prisma-generated";
import { ExternalProvider, PredefinedOrgRole, IntegrationStatus, ConversationType, OrgMemberStatus } from "./enum";

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    count?: number;
    totalCount?: number;
    totalPages?: number;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// API Error response
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error: string;
}

// Auth API Types
export interface SignUpRequest {
    email?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
    password: string;
}

export interface SignInRequest {
    email?: string;
    phoneNumber?: string;
    password: string;
}

export interface RequestOtpRequest {
    email?: string;
    phoneNumber?: string;
}

export interface VerifyOtpRequest {
    email?: string;
    phoneNumber?: string;
    otpString: string;
}

export interface AuthResponse {
    user: IUser;
    accessToken?: string;
    refreshToken?: string;
}

// Organization API Types
export interface CreateOrgRequest {
    name: string;
    inviteMembers?: Array<{
        email: string;
        predefinedRole: PredefinedOrgRole;
    }>;
    appProviders?: Array<{
        provider: ExternalProvider;
    }>;
}

export interface AddIntegrationsRequest {
    provider: ExternalProvider;
    label: string;

}

export interface CreateOrgResponse {
    message: string;
    organization: IOrganization;
}

export interface ListOrgsResponse extends ApiResponse<IOrganization[]> {
    data: IOrganization[];
}

export interface UpdateOrgRequest {
    name?: string;
}

export interface InviteMemberRequest {
    email: string;
    predefinedRole?: PredefinedOrgRole;
    roleId?: string;
}

export interface UpdateMemberRequest {
    predefinedRole?: PredefinedOrgRole;
    roleId?: string;
}

export interface ListMembersResponse extends ApiResponse<IOrganizationMember[]> {
    data: IOrganizationMember[];
}

export interface ListInvitesResponse extends ApiResponse<IInvite[]> {
    data: IInvite[];
}

// Project API Types
export interface CreateProjectRequest {
    name: string;
    description?: string;
}

export interface CreateProjectResponse extends ApiResponse<IProject> {
    data: IProject;
}

export interface ListProjectsResponse extends ApiResponse<IProject[]> {
    data: IProject[];
}

export interface AddProjectMemberRequest {
    userId: string;
    predefinedRole?: PredefinedOrgRole;
    roleId?: string;
}

export interface UpdateProjectMemberRoleRequest {
    predefinedRole?: PredefinedOrgRole;
    roleId?: string;
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    predefinedRole?: PredefinedOrgRole;
    roleId?: string;
    status: OrgMemberStatus;
    addedBy: string;
    createdAt: Date;
    updatedAt: Date;
    user: IUser;
    role: string;
}

export interface UpdateProjectRequest {
    name?: string;
    description?: string;
}

export interface LinkIntegrationRequest {
    integrationId: string;
    resourceIds: string[];
}

export interface IntegrationResource {
    id: string;
    name: string;
    type: string;
}


export interface GetAvailableResourcesResponse {
    id: string;
    integrationId: string;
    provider: ExternalProvider;
    providerId: string;
    name: string;
    url: string;
    metadata: {
        private?: boolean;
        archived?: boolean;
        pushedAt?: string;
        updatedAt?: string;
    };
    imported: boolean;
    createdAt: string;
    updatedAt: string;
    integration: IIntegration;
}

// Integration API Types
export interface GetInstallUrlResponse {
    url: string;
    message?: string;
}

export interface GitHubRepo {
    id: string;
    name: string;
    full_name: string;
    description?: string | null;
    private: boolean;
    default_branch: string;
    url?: string;
    updated_at?: string;
    pushed_at?: string;
}

// Project-specific repository (with accessibility info)
export interface ProjectRepository {
    id: string | null;
    name: string;
    url: string;
    updated_at: string | null;
    pushed_at: string | null;
    accessible: boolean;
}

// Project Repositories Response
export interface ProjectRepositoriesResponse {
    projectId: string;
    integrationId: string;
    connectionId?: string;
    repositories: ProjectRepository[];
    message?: string;
}

// Sync Repositories Response
export interface SyncRepositoriesResponse {
    synced: number;
    repositories: Array<{
        id: string;
        name: string;
        url: string;
        updated_at: string;
        pushed_at: string;
    }>;
    projectId: string | null;
    message?: string;
}

export interface GitHubOverview {
    repo: {
        name: string;
        description: string | null;
        defaultBranch: string;
        stars: number;
        forks: number;
    };
    activity: {
        commits: number;
        pullRequests: number;
        issues: number;
    };
    status: string;
}

// GitHub Commit Types
export interface GitHubCommitSummary {
    sha: string;
    message: string;
    author: string;
    authorUsername?: string;
    authorAvatar?: string;
    date: string;
    filesChanged: number;
    additions: number;
    deletions: number;
}

export interface GitHubCodeQualityIssue {
    type: string;
    severity: string;
    description: string;
}

export interface GitHubCodeQuality {
    summary: string;
    score: number | null;
    issues: GitHubCodeQualityIssue[];
}

export interface GitHubSecurityFinding {
    type: string;
    severity: string;
    description: string;
    file?: string;
}

export interface GitHubSecurity {
    risk: "none" | "low" | "medium" | "high";
    summary: string;
    findings: GitHubSecurityFinding[];
}

export interface GitHubCommitFile {
    filename: string;
    patch?: string;
    additions?: number;
    deletions?: number;
}

export interface GitHubCommitDetail {
    commit: {
        sha: string;
        message: string;
        date?: string;
    };
    aiSummary: string;
    codeQuality?: GitHubCodeQuality;
    security: GitHubSecurity;
    files: GitHubCommitFile[];
    canDebug: boolean;
}

export interface DebugGithubCommitPatch {
    filename: string;
    diff: string;
}

export interface DebugGithubCommitResponse {
    explanation: string;
    suggestedCode?: string;
    patches?: DebugGithubCommitPatch[];
    risk: "low" | "medium" | "high";
    safeToApply: boolean;
    confidence: number;
}

// GitHub Pull Request Types
export interface GitHubPullRequest {
    id: string;
    number: number;
    title: string;
    state: "open" | "closed";
    merged: boolean;
    commits: number;
    filesChanged: number;
    additions: number;
    deletions: number;
    aiSummary: string;
}

export interface GitHubPullRequestsResponse {
    pullRequests: GitHubPullRequest[];
}

// GitHub Issue Types
export interface GitHubIssue {
    number: number;
    title: string;
    state: "open" | "closed";
    labels: string[];
    aiAnalysis: string;
    suggestedFix: string;
}

export interface GitHubIssuesResponse {
    issues: GitHubIssue[];
}

// GitHub Commits Response
export interface GitHubCommitsResponse {
    commits: GitHubCommitSummary[];
}

// Chat/Conversation API Types
export interface CreateConversationRequest {
    projectId?: string;
    organizationId?: string;
    title?: string;
    type?: ConversationType;
    /**
     * Org slug/id from the current URL. Disambiguates a project slug (project slugs are unique only
     * per-org), so the backend resolves the project within THIS org instead of guessing across orgs.
     */
    orgScope?: string;
}

export type ListConversationsResponse = IConversation[];

export interface SendMessageRequest {
    question: string;
}

// Raw event source (from RAG search)
export interface RawEventSource {
    id: string;
    type?: string;
    title?: string;
    provider?: ExternalProvider;
    externalId?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
}

// LLM Output source
export interface LlmOutputSource {
    id: string;
    type?: string;
    content?: string;
    metadata?: Record<string, unknown>;
}

// Chat message source with full details
export interface ChatMessageSourceDetails {
    id: string;
    chatMessageId: string;
    rawEventId?: string | null;
    llmOutputId?: string | null;
    relevanceScore: number;
    createdAt: Date | string;
    rawEvent?: RawEventSource | null;
    llmOutput?: LlmOutputSource | null;
}

// Sender info for chat messages
export interface ChatMessageSender {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
}

export interface ChatMessageSenderMember {
    user: ChatMessageSender;
}

// Extended chat message with full details (as returned from API)
export interface ChatMessageWithDetails extends Omit<IChatMessage, 'sources'> {
    sender?: ChatMessageSender | null;
    senderMember?: ChatMessageSenderMember | null;
    sources?: ChatMessageSourceDetails[];
    /** Assistant-only extras persisted with the message — currently the agent's step timeline. */
    metadata?: { steps?: Array<{ id: string; label: string; detail?: string; status: "running" | "done" }> } | null;
}

export interface SendMessageResponse {
    status: "processing";
    jobId: string;
    userMessage: ChatMessageWithDetails;
    message: string;
}

// Conversation with full details (as returned from API)
export interface ConversationWithDetails extends Omit<IConversation, 'messages'> {
    messages?: ChatMessageWithDetails[];
    project?: {
        id: string;
        name: string;
        organization: IOrganization;
    };
    organization?: IOrganization;
}

// WebSocket Event Types
export interface WsNewMessageEvent {
    conversationId: string;
    message: ChatMessageWithDetails;
    jobId?: string;
}

export interface WsMessageProcessingEvent {
    conversationId: string;
    userMessageId: string;
    jobId: string;
    status: "processing" | "completed" | "failed";
    stage?: string;
    assistantMessageId?: string;
    error?: string;
}

export interface WsTypingEvent {
    conversationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
}

export interface WsMessageReadEvent {
    conversationId: string;
    messageId: string;
    userId: string;
}

// SSE Integration Status
export interface IntegrationStatusEvent {
    integrations: Array<{
        id: string;
        type: ExternalProvider;
        status: IntegrationStatus;
    }>;
}

// New SSE payload for org integration status (backend sends: { data: IntegrationStatusItem[] })
export type OrgIntegrationOauthStatus = "CONNECTED" | "NOT_CONNECTED";

export interface OrgIntegrationOauthAccount {
    identifier: string;
    providerUserId: string;
}

export interface OrgIntegrationStatusItem {
    integrationId: string;
    app: ExternalProvider;
    authType: string;
    status: IntegrationStatus;
    statusMessage?: string;
    externalAccountId: string | null;
    externalAccount: string | null;
    oauthStatus?: OrgIntegrationOauthStatus;
    oauthConnectedAt?: string | null;
    oauthAccount?: OrgIntegrationOauthAccount | null;
    canAutoConnect?: boolean;
    autoConnectCandidates?: Array<{
        orgId: string;
        orgSlug: string;
        orgName: string;
        integrationId: string;
        status: IntegrationStatus;
        externalAccountId: string | null;
        externalAccount: string | null;
        oauthAccount?: OrgIntegrationOauthAccount | null;
    }>;
}

export interface OrgIntegrationStatusSseEvent {
    data: OrgIntegrationStatusItem[];
}

// SSE Job Status
export interface JobStatusEvent {
    jobId: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    attempts: number;
    payload: Record<string, unknown>;
    updatedAt: string;
    completed?: boolean;
}

// Discord API Types
export interface GetDiscordOAuthUrlResponse {
    url: string;
    message?: string;
}
export interface GetDiscordUserGuildsResponse {
    id: string;
    name: string;
    icon: string | null;
    botInstalled: boolean;
}

export interface GetDiscordChannelResponse {
    id: string;
    name: string;
    type: number;
    guild_id: string;
}

export interface GetSlackChannelResponse {
    id: string,
    created: number,
    creator: string,
    is_org_shared: boolean,
    is_im: boolean,
    context_team_id: string,
    updated: number,
    name: string,
    name_normalized: string,
    is_channel: boolean,
    is_group: boolean,
    is_mpim: boolean,
    is_private: boolean,
    is_archived: boolean,
    is_general: boolean,
    is_shared: boolean,
    is_ext_shared: boolean,
    unlinked: number,
    is_pending_ext_shared: boolean,
    pending_shared: [],
    parent_conversation: string,
    purpose: {
        value: string,
        creator: string,
        last_set: number
    },
    topic: {
        value: string,
        creator: string,
        last_set: number
    },
    shared_team_ids: [
        string
    ],
    pending_connected_team_ids: [],
    is_member: boolean,
    num_members: number,
    properties: {
        use_case: string
    },
    previous_names: [
        string
    ]
}

export interface GetJiraProjectsResponse {
    id: string,
    expand: string,
    self: string,
    key: string,
    name: string,
    avatarUrls: {
        "48x48": string,
        "24x24": string,
        "16x16": string,
        "32x32": string,
    },
    projectTypeKey: string,
    simplified: boolean,
    style: string,
    isPrivate: boolean,
    properties: Record<string, unknown>,
    entityId: string,
    uuid: string
}
export interface ListLinearTeamsResponse {
    id: string,
    key: string,
    name: string,
    description: string,
}
export interface ListLinearIssuesResponse {
    id: string,
}