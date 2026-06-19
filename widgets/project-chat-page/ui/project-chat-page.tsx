"use client";

import { useParams } from "next/navigation";
import { AiChatPanel } from "@/widgets/ai-chat-panel";

export function ProjectChatPage() {
    const { projectId, organizationId } = useParams<{ projectId: string; organizationId?: string }>();
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AiChatPanel
                scope={{ kind: "project", projectId: projectId ?? "", organizationId: organizationId || undefined }}
                height="h-full"
                className="min-h-0 flex-1"
            />
        </div>
    );
}
