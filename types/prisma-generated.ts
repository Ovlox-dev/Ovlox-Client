import { ProjectMember } from "./api-types";
import {
    AccountType,
    AuthProvider,
    ExternalProvider,
    Gender,
    IntegrationAuthType,
    IntegrationStatus,
    OrgMemberStatus,
    PredefinedOrgRole,
    UserRole,
    InviteStatus,
    ConversationType,
    ChatRole,
    ProjectStatus,
    ProjectVisibility,
    ProjectSyncStatus
} from "./enum";

export interface IUser {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    isVerified: boolean;
    isOnline: boolean;
    gender: Gender | null;
    role: UserRole;
    lastLogin: string | null;

    // relations simplified:
    authIdentities?: IAuthIdentity[];
    memberships?: IOrganizationMember[];
}

export interface IAuthIdentity {
    id: string;
    provider: AuthProvider;
    providerId: string;
    type: AccountType;
    createdAt: string;
}

export interface IOrganization {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    owner: IUser;
    plan?: string | null;
    creditBalance?: number;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Relations
    members?: IOrganizationMember[];
    projects?: IProject[];
    integrations?: IIntegration[];
    invites?: IInvite[];
}

export interface IOrganizationMember {
    id: string;
    organization?: IOrganization;
    organizationId: string;
    user: IUser;
    userId: string;
    predefinedRole?: PredefinedOrgRole | null;
    roleId?: string | null;
    status: OrgMemberStatus;
    invitedBy?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    contributions?: number;
    projects?: IProject[];
}

export interface IIntegration {
    id: string;
    organization?: IOrganization;
    organizationId: string;
    type: ExternalProvider;
    authType: IntegrationAuthType;
    externalAccountId?: string | null;
    externalAccount?: string | null;
    status: IntegrationStatus;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
    lastWebhookAt?: string | null;
    lastValidatedAt?: string | null;
    lastSyncAt?: string | null;
    config?: Record<string, string> | null;
    scope?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    resources?: IIntegrationResource[];
}

export interface IIntegrationResourceMetadata {
    private: boolean;
    archived: boolean;
    pushedAt: string;
    updatedAt: string;
}
export interface IIntegrationResource {
    id: string;
    integrationId: string;
    provider: ExternalProvider;
    providerId: string;
    name: string;
    url?: string | null;
    metadata?: IIntegrationResourceMetadata | null;
    imported: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface IIntegrationConnection {
    id: string;
    project?: IProject;
    projectId: string;
    integration?: IIntegration;
    integrationId: string;
    items: Record<string, unknown> | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface IProject {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    syncStatus: ProjectSyncStatus;
    lastSyncAt?: string | null;
    syncError?: string | null;
    isDeleted: boolean;
    deletedAt?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    organization?: IOrganization;
    createdBy?: IUser;
    integrations?: IIntegrationConnection[];
    members?: ProjectMember[];
    memberCount?: number;
    resources?: IIntegrationResource[];
    resourceCount?: number;
}

export interface IInvite {
    id: string;
    organization?: IOrganization;
    organizationId: string;
    email: string;
    predefinedRole?: PredefinedOrgRole | null;
    roleId?: string | null;
    invitedBy: string;
    token: string;
    status: InviteStatus;
    expiresAt: string;
    userId?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface IConversation {
    id: string;
    type: ConversationType;
    projectId?: string | null;
    organizationId?: string | null;
    taskId?: string | null;
    title?: string | null;
    createdBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    messages?: IChatMessage[];
}

export interface IChatMessage {
    id: string;
    conversationId: string;
    role: ChatRole;
    content: string;
    senderId?: string | null;
    senderMemberId?: string | null;
    sources?: IChatMessageSource[];
    metadata?: Record<string, unknown> | null;
    createdAt: Date | string;
}

export interface IChatMessageSource {
    id: string;
    chatMessageId: string;
    rawEventId?: string | null;
    llmOutputId?: string | null;
    relevanceScore?: number | null;
    createdAt: Date | string;
}

export interface IJob {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRY";
    attempts: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
