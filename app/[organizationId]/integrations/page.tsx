"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import type { IconType } from "react-icons"
import { IoLogoGithub } from "react-icons/io5"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"

import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { useOrgByIdentifier, useOrgIntegrations } from "@/shared/queries/org.queries"

import { PageTitle } from "@/components/page-title"

import { GitHubIntegration } from "@/widgets/integrations/ui/github-integration"
import { SlackIntegration } from "@/widgets/integrations/ui/slack-integration"
import { JiraIntegration } from "@/widgets/integrations/ui/jira-integration"
import { LinearIntegration } from "@/widgets/integrations/ui/linear-integration"
import { DiscordIntegration } from "@/widgets/integrations/ui/discord-integration"
import { integrationForApp } from "@/widgets/integrations/model/integration-utils"

type IntegrationToolDef = {
  id: string
  name: string
  icon: IconType
  description: string
  install?: boolean
  connect: boolean
  managePath?: string
  comingSoon?: boolean
}

const INTEGRATION_CATALOG: IntegrationToolDef[] = [
  {
    id: "github",
    name: "GitHub",
    icon: IoLogoGithub,
    description: "Connect your repositories and pull requests.",
    connect: true,
    install: true,
    managePath: "github",
  },
  {
    id: "jira",
    name: "Jira",
    icon: SiJira,
    description: "Sync issues and sprint progress automatically.",
    connect: false,
    install: true,
    managePath: "jira",
  },
  {
    id: "slack",
    name: "Slack",
    icon: SiSlack,
    description: "Send updates and notifications to your team channels.",
    connect: false,
    install: true,
    managePath: "slack",
  },
  {
    id: "linear",
    name: "Linear",
    icon: SiLinear,
    description: "Track issues, manage sprints, and plan product development.",
    install: true,
    connect: false,
    managePath: "linear",
  },
  {
    id: "discord",
    name: "Discord",
    icon: SiDiscord,
    description: "Communicate with your team through channels and voice chat.",
    install: false,
    connect: true,
    managePath: "discord",
  },
]

function isToolInSetup(app: IntegrationToolDef, integrations: OrgIntegrationStatusItem[], addedIds: ReadonlySet<string>) {
  return addedIds.has(app.id) || Boolean(integrationForApp(integrations, app.id))
}

export default function IntegrationsPage() {
  const params = useParams<{ organizationId: string }>()
  // Route segment is the org slug (legacy URLs may still use a UUID).
  const routeIdentifier = params?.organizationId ?? ""
  const { data: orgData, isLoading: orgLoading } = useOrgByIdentifier(routeIdentifier)
  const org = orgData?.organization
  const organizationId = org?.id ?? ""
  const orgSlug = org?.slug ?? routeIdentifier

  const [addedIds, setAddedIds] = useState(() => new Set<string>())

  const {
    data: integrationsData,
    isLoading: integrationsLoading,
    error: integrationsError,
    refetch,
  } = useOrgIntegrations(organizationId)

  const integrations = useMemo(() => integrationsData ?? [], [integrationsData])
  const isLoading = orgLoading || integrationsLoading

  const setupTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )
  const availableTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => !isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )

  const basePath = `/${encodeURIComponent(orgSlug)}/integrations`

  const handleAddedToSetup = (appId: string) => {
    setAddedIds((prev) => {
      const next = new Set(prev)
      next.add(appId)
      return next
    })
  }

  const renderCard = (app: IntegrationToolDef) => {
    const inSetup = isToolInSetup(app, integrations, addedIds)
    const integration = integrationForApp(integrations, app.id)

    switch (app.id) {
      case "github":
        return (
          <GitHubIntegration
            organizationId={organizationId}
            basePath={basePath}
            integration={integration}
            inSetup={inSetup}
            onAddedToSetup={handleAddedToSetup}
            refetchIntegrations={() => void refetch()}
          />
        )
      case "slack":
        return (
          <SlackIntegration
            organizationId={organizationId}
            basePath={basePath}
            integration={integration}
            inSetup={inSetup}
            onAddedToSetup={handleAddedToSetup}
            refetchIntegrations={() => void refetch()}
          />
        )
      case "jira":
        return (
          <JiraIntegration
            organizationId={organizationId}
            basePath={basePath}
            integration={integration}
            inSetup={inSetup}
            onAddedToSetup={handleAddedToSetup}
            refetchIntegrations={() => void refetch()}
          />
        )
      case "linear":
        return (
          <LinearIntegration
            organizationId={organizationId}
            basePath={basePath}
            integration={integration}
            inSetup={inSetup}
            onAddedToSetup={handleAddedToSetup}
            refetchIntegrations={() => void refetch()}
          />
        )
      case "discord":
        return (
          <DiscordIntegration
            organizationId={organizationId}
            basePath={basePath}
            integration={integration}
            inSetup={inSetup}
            onAddedToSetup={handleAddedToSetup}
            refetchIntegrations={() => void refetch()}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Integrations"
        description="Connect your tools to sync activity, projects, and team updates."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[14px] border border-(--line) bg-(--bg-2) p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="size-12 rounded-[10px] bg-(--bg-3)" />
                <div className="h-5 w-24 rounded-full bg-(--bg-3)" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-(--bg-3)" />
                <div className="h-3 w-full rounded bg-(--bg-3)" />
              </div>
              <div className="pt-4 border-t border-(--line-2) flex justify-end">
                <div className="h-9 w-24 rounded-md bg-(--bg-3)" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && integrationsError ? (
        <div className="rounded-[14px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] p-5">
          <p className="text-sm text-(--danger) font-medium">
            {integrationsError instanceof Error ? integrationsError.message : "Failed to load integrations"}
          </p>
        </div>
      ) : null}

      {!integrationsLoading && setupTools.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-(--fg)">
              Setup
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
              {setupTools.length} {setupTools.length === 1 ? "tool" : "tools"} added
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {setupTools.map((app) => (
              <div key={app.id} className="block h-full">
                {renderCard(app)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && availableTools.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-(--fg)">
              Available
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-(--fg-3)">
              {availableTools.length} ready to add
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableTools.map((app) => (
              <div key={app.id} className="block h-full">
                {renderCard(app)}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}