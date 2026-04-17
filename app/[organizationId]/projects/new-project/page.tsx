"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputField, TextareaField } from "@/components/form-components"
import { useForm } from "react-hook-form"
import { useCreateProject } from "@/shared/queries/projects.queries"
import { useParams, useRouter } from "next/navigation"

type ProjectForm = {
    projectName: string
    projectDescription: string
}

export default function NewProject() {
    const { organizationId } = useParams<{ organizationId: string }>()
    const router = useRouter();
    const { register, handleSubmit, formState: { errors }, } = useForm<ProjectForm>({
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
                onSuccess: (project) => {
                    router.replace(`/${organizationId}/projects/${project.data.id}/setup`)
                }
            })
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
                    <p className="text-muted-foreground">Set up your project workspace and configure team access</p>
                </div>

                {/* Progress Steps */}
                {/* <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon
                            const isActive = currentStep === step.id
                            const isCompleted = getStepIndex(step.id as Step) < currentStepIndex

                            return (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className={`flex items-center justify-center size-12 rounded-full border-2 transition-colors ${isCompleted
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : isActive
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-background border-border text-muted-foreground"
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="size-6" />
                                            ) : (
                                                <StepIcon className="size-6" />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-4 transition-colors ${getStepIndex(step.id as Step) < currentStepIndex
                                                ? "bg-primary"
                                                : "bg-border"
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div> */}

                {/* Form Content */}
                <Card className="p-8">
                    {/* Step 1: Project Details */}
                    {/* {currentStep === "details" && ( */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Project Details</h2>
                            <p className="text-muted-foreground mb-6">
                                Basic information about your project
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Project Name */}
                            <InputField
                                name="projectName"
                                label="Project Name"
                                placeholder="e.g. Mobile App Redesign"
                                register={register}
                                errors={errors}
                                required
                            />

                            {/* Description */}
                            <TextareaField
                                name="projectDescription"
                                label="Description"
                                placeholder="What is this project about?"
                                register={register}
                                errors={errors}
                            />
                            <Button type="submit" >Create Project</Button>
                        </form>
                    </div>
                    {/* )} */}

                    {/* Step 2: Team Members */}
                    {/* {currentStep === "members" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Team Access</h2>
                                <p className="text-muted-foreground mb-6">
                                    Select team members and set their access levels
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                                <Input
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {projectMembers.length > 0 && (
                                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                    <CheckCircle2 className="size-5 text-primary" />
                                    <p className="text-sm">
                                        <span className="font-semibold">{projectMembers.length}</span> member
                                        {projectMembers.length !== 1 && "s"} selected
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {filteredMembers.map((member) => {
                                    const projectMember = projectMembers.find(m => m.memberId === member.id)
                                    const isSelected = !!projectMember

                                    return (
                                        <Card
                                            key={member.id}
                                            className={`p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : ""
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Avatar className="size-10">
                                                        <AvatarImage src={member.avatar} />
                                                        <AvatarFallback>
                                                            {member.name.split(" ").map((n) => n[0]).join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{member.name}</p>
                                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                                    </div>
                                                    <Badge variant={member.role === "owner" ? "destructive" : member.role === "admin" ? "secondary" : "outline"} className="capitalize">
                                                        {member.role}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isSelected && (
                                                        <Select
                                                            value={projectMember.access}
                                                            onValueChange={(value: "view" | "edit" | "admin") =>
                                                                updateMemberAccess(member.id, value)
                                                            }
                                                        >
                                                            <SelectTrigger className="w-[120px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="view">View</SelectItem>
                                                                <SelectItem value="edit">Edit</SelectItem>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    <Button
                                                        variant={isSelected ? "destructive" : "default"}
                                                        size="sm"
                                                        onClick={() => toggleMember(member.id, "edit")}
                                                    >
                                                        {isSelected ? (
                                                            <>
                                                                <X className="size-4" />
                                                                Remove
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="size-4" />
                                                                Add
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )} */}

                    {/* Step 3: Data Sources */}
                    {/* {currentStep === "datasources" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
                                <p className="text-muted-foreground mb-6">
                                    Connect data sources to import and track information
                                </p>
                            </div>

                            <div className="space-y-4">
                                {dataSources.map((source) => (
                                    <Card key={source.id} className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="p-2.5 rounded-lg bg-background border border-border">
                                                    {source.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold">{source.name}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {source.type}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        {source.description}
                                                    </p>
                                                    {source.enabled && source.config && (
                                                        <div className="space-y-2">
                                                            {source.config.repositories && (
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-medium">Select Repositories</Label>
                                                                    <Select defaultValue={source.config.repositories[0]}>
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {source.config.repositories.map((repo) => (
                                                                                <SelectItem key={repo} value={repo}>{repo}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            {source.config.channels && (
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-medium">Select Channels</Label>
                                                                    <Select defaultValue={source.config.channels[0]}>
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {source.config.channels.map((channel) => (
                                                                                <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            {source.config.boards && (
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-medium">Select Boards</Label>
                                                                    <Select defaultValue={source.config.boards[0]}>
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {source.config.boards.map((board) => (
                                                                                <SelectItem key={board} value={board}>{board}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Switch
                                                checked={source.enabled}
                                                onCheckedChange={() => toggleDataSource(source.id)}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {dataSources.filter(ds => ds.enabled).length > 0 && (
                                <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                    <CheckCircle2 className="size-5 text-primary" />
                                    <p className="text-sm">
                                        <span className="font-semibold">{dataSources.filter(ds => ds.enabled).length}</span> data source
                                        {dataSources.filter(ds => ds.enabled).length !== 1 && "s"} enabled
                                    </p>
                                </div>
                            )}
                        </div>
                    )} */}

                    {/* Step 4: Settings */}
                    {/* {currentStep === "settings" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
                                <p className="text-muted-foreground mb-6">
                                    Configure additional project preferences
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Card className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium mb-1">Project Visibility</p>
                                            <p className="text-sm text-muted-foreground">
                                                Control who can see this project
                                            </p>
                                        </div>
                                        <Select value={visibility} onValueChange={(value: "public" | "private") => setVisibility(value)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="public">Public</SelectItem>
                                                <SelectItem value="private">Private</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Card>

                                <Card className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium mb-1">Auto-sync Data</p>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically sync data from connected sources every hour
                                            </p>
                                        </div>
                                        <Switch
                                            checked={autoSync}
                                            onCheckedChange={setAutoSync}
                                        />
                                    </div>
                                </Card>

                                <Card className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium mb-1">Email Notifications</p>
                                            <p className="text-sm text-muted-foreground">
                                                Receive email updates about project activity
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notifications}
                                            onCheckedChange={setNotifications}
                                        />
                                    </div>
                                </Card>

                                <Card className="p-5 bg-muted/50">
                                    <h3 className="font-semibold mb-4">Project Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Project Name</span>
                                            <span className="text-sm font-medium">{getValues("projectName") || "—"}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Team Members</span>
                                            <span className="text-sm font-medium">{projectMembers.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Data Sources</span>
                                            <span className="text-sm font-medium">{dataSources.filter(ds => ds.enabled).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Visibility</span>
                                            <Badge variant="outline" className="capitalize">{visibility}</Badge>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )} */}

                    {/* Navigation Buttons */}
                    {/* <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === "details"}
                        >
                            <ArrowLeft className="size-4" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            {currentStep !== "settings" ? (
                                <Button onClick={handleNext} disabled={!canProceed()}>
                                    Next
                                    <ArrowRight className="size-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleCreate} disabled={!canProceed()}>
                                    <Check className="size-4" />
                                    Create Project
                                </Button>
                            )}
                        </div>
                    </div> */}
                </Card>
            </div>
        </div>
    )
}