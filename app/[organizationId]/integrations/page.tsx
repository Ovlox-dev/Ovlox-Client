"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import type { IconType } from "react-icons"
import { IoLogoGithub } from "react-icons/io5"
import { SiDiscord, SiJira, SiLinear, SiSlack } from "react-icons/si"

import type { OrgIntegrationStatusItem } from "@/types/api-types"
import { listIntegrations } from "@/entities/organization/api/org"

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
  const organizationId = params?.organizationId ?? ""
  const [addedIds, setAddedIds] = useState(() => new Set<string>())

  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError, refetch } = useQuery({
    queryKey: ["listIntegrations", organizationId],
    queryFn: async () => {
      const res = await listIntegrations(organizationId)
      return res ?? null
    },
  })

  const integrations = useMemo(() => integrationsData ?? [], [integrationsData])

  const setupTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )
  const availableTools = useMemo(
    () => INTEGRATION_CATALOG.filter((t) => !isToolInSetup(t, integrations, addedIds)),
    [addedIds, integrations]
  )

  const basePath = `/${encodeURIComponent(organizationId)}/integrations`

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
        title="Setup Integrations"
        description="Connect your tools to sync activity, projects, and team updates."
      />

      {integrationsLoading ? <p className="text-sm text-[#888888]">Loading integrations...</p> : null}
      {!integrationsLoading && integrationsError ? (
        <p className="text-sm text-destructive">
          {integrationsError instanceof Error ? integrationsError.message : "Failed to load integrations"}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {setupTools.map((app) => (
          <div key={app.id} className="block h-full">
            {renderCard(app)}
          </div>
        ))}
      </div>

      {availableTools.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-white">Available Integrations</h2>
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