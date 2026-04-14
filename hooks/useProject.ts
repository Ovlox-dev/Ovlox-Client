import * as React from "react";
import { useProjectStore } from "@/store/project.store";
import { useRouter } from "next/navigation";
import { getProject } from "@/shared/api/projects";
import { IProject } from "@/types/prisma-generated";
import { toast } from "sonner";

export const useProject = () => {
    const { currentProject, setCurrentProject, clearCurrentProject } = useProjectStore();
    const router = useRouter();

    const selectProject = React.useCallback(async (project: IProject, orgId?: string) => {
        setCurrentProject(project);
        if (orgId) {
            router.push(`/${orgId}/projects/${project.id}`);
        } else {
            router.push(`/projects/${project.id}`);
        }
    }, [router, setCurrentProject]);

    const loadProject = React.useCallback(async (orgId: string, projectId: string) => {
        try {
            const project = await getProject(orgId, projectId);
            setCurrentProject(project);
            return project;
        } catch (error) {
            toast.error("Failed to load project");
            throw error;
        }
    }, [setCurrentProject]);

    return {
        currentProject,
        setCurrentProject,
        selectProject,
        loadProject,
        clearCurrentProject,
    };
};
