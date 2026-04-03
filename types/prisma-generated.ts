import { AccountType, AuthProvider, ExternalProvider, Gender, IntegrationAuthType, IntegrationStatus, OrgMemberStatus, PredefinedOrgRole, UserRole, InviteStatus, ConversationType, ChatRole } from "./enum";

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

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
    config?: Record<string, any> | null;
    externalAccountId?: string | null;
    externalAccount?: string | null;
    status: IntegrationStatus;
    createdAt: Date | string;
    updatedAt: Date | string;
    resources?: IIntegrationResource[];
}

export interface IIntegrationResource {
    id: string;
    integrationId: string;
    provider: ExternalProvider;
    providerId: string;
    name: string;
    url?: string | null;
    metadata?: Record<string, any> | null;
    imported: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface IProject {
    id: string;
    organization?: IOrganization;
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    createdById: string;
    createdBy?: IUser;
    settings?: Record<string, any> | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    integrations?: IIntegrationConnection[];
}

export interface IIntegrationConnection {
    id: string;
    project?: IProject;
    projectId: string;
    integration?: IIntegration;
    integrationId: string;
    items: Record<string, any> | null;
    createdAt: Date | string;
    updatedAt: Date | string;
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
    metadata?: Record<string, any> | null;
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
    payload: Record<string, any>;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRY";
    attempts: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
