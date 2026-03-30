import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IOrganization } from "@/types/prisma-generated";

interface OrgState {
    currentOrg: IOrganization | null;
    setCurrentOrg: (org: IOrganization | null) => void;
    clearCurrentOrg: () => void;
}

export const useOrgStore = create<OrgState>()(
    persist(
        (set) => ({
            currentOrg: null,
            setCurrentOrg: (org) => set({ currentOrg: org }),
            clearCurrentOrg: () => set({ currentOrg: null }),
        }),
        {
            name: "org-storage",
        }
    )
);
