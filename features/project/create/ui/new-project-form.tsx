"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputField, TextareaField } from "@/components/form-components"
import { useCreateProject } from "@/entities/project"

const projectFormSchema = z.object({
    projectName: z
        .string()
        .trim()
        .min(1, "Project name is required")
        .min(2, "Project name must be at least 2 characters")
        .max(100, "Project name must be 100 characters or fewer"),
    projectDescription: z
        .string()
        .trim()
        .max(500, "Description must be 500 characters or fewer")
        .optional()
        .or(z.literal("")),
})

type ProjectForm = z.infer<typeof projectFormSchema>

export function NewProjectForm() {
    const { organizationId } = useParams<{ organizationId: string }>()
    const router = useRouter()
    const { register, handleSubmit, formState: { errors } } = useForm<ProjectForm>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            projectName: "",
            projectDescription: "",
        },
    })

    const { mutate: createProject, isPending } = useCreateProject(organizationId as string)

    const onSubmit = (data: ProjectForm) => {
        createProject(
            {
                name: data.projectName,
                description: data.projectDescription,
            },
            {
                onSuccess: (payload) => {
                    const body = payload as {
                        id?: string;
                        slug?: string;
                        data?: { id?: string; slug?: string };
                    }
                    const projectIdentifier =
                        body.data?.slug ?? body.slug ?? body.data?.id ?? body.id
                    if (!projectIdentifier) {
                        toast.error("Project created, but no identifier was returned. Please refresh and try again.")
                        return
                    }
                    router.replace(`/${organizationId}/projects/${projectIdentifier}/setup`)
                },
                onError: (err) => {
                    toast.error("Failed to create project", { description: (err as Error).message })
                },
            }
        )
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
                    <p className="text-muted-foreground">Set up your project workspace and configure team access</p>
                </div>

                <Card className="p-8">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Project Details</h2>
                            <p className="text-muted-foreground mb-6">
                                Basic information about your project
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <InputField
                                name="projectName"
                                label="Project Name"
                                placeholder="e.g. Mobile App Redesign"
                                register={register}
                                errors={errors}
                                required
                            />

                            <TextareaField
                                name="projectDescription"
                                label="Description"
                                placeholder="What is this project about?"
                                register={register}
                                errors={errors}
                            />
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Creating…" : "Create Project"}
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    )
}

