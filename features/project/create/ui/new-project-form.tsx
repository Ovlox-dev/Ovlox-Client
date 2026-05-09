"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useParams, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputField, TextareaField } from "@/components/form-components"
import { useCreateProject } from "@/entities/project"

type ProjectForm = {
    projectName: string
    projectDescription: string
}

export function NewProjectForm() {
    const { organizationId } = useParams<{ organizationId: string }>()
    const router = useRouter()
    const { register, handleSubmit, formState: { errors } } = useForm<ProjectForm>({
        defaultValues: {
            projectName: "",
            projectDescription: "",
        },
    })

    const { mutate: createProject } = useCreateProject(organizationId as string)

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
                    if (!projectIdentifier) { return }
                    router.replace(`/${organizationId}/projects/${projectIdentifier}/setup`)
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
                            <Button type="submit">Create Project</Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    )
}

