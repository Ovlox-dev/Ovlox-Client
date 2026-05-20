import { PredefinedOrgRole, UserRole } from "./enum";

export interface CurrentUser {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: UserRole;
    organizations: {
        id: string;
        name: string;
        slug: string;
        predefinedRole: PredefinedOrgRole | null;
    }[];
}