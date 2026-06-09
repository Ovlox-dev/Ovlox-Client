"use client";

import { useParams } from "next/navigation";
import { AiChatPanel } from "@/widgets/ai-chat-panel";

export function ProjectChatPage() {
    const { projectId } = useParams<{ projectId: string }>();
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AiChatPanel
                scope={{ kind: "project", projectId: projectId ?? "" }}
                height="h-full"
                className="min-h-0 flex-1"
            />
        </div>
    );
}
