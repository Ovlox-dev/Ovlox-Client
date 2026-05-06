"use client";

import { useParams } from "next/navigation";
import { AiChatPanel } from "@/widgets/ai-chat-panel";

export function ProjectChatPage() {
    const { projectId } = useParams<{ projectId: string }>();
    return (
        <div className="p-4 md:p-6">
            <AiChatPanel
                scope={{ kind: "project", projectId: projectId ?? "" }}
                height="h-[calc(100vh-220px)]"
            />
        </div>
    );
}
