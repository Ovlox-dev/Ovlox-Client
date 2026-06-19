"use client";

import clsx from "clsx";

type DiffViewerProps = {
    patch: string;
};

export function DiffViewer({ patch }: DiffViewerProps) {
    if (typeof patch !== "string" || patch.length === 0) {
        return null;
    }
    const lines = patch.split("\n");

    return (
        <pre className="text-xs font-mono overflow-x-auto">
            {lines.map((line, idx) => {
                const isAdd = line.startsWith("+") && !line.startsWith("+++");
                const isRemove = line.startsWith("-") && !line.startsWith("---");
                const isHunk = line.startsWith("@@");

                return (
                    <div
                        key={idx}
                        className={clsx(
                            "flex",                           // 👈 IMPORTANT
                            "px-3 py-0.5 whitespace-pre-wrap",
                            isAdd && "bg-green-500/10 text-green-400",
                            isRemove && "bg-red-500/10 text-red-400",
                            isHunk && "bg-muted/50 text-muted-foreground font-semibold"
                        )}
                    >
                        {/* LINE NUMBER COLUMN */}
                        <div className="w-10 text-right pr-2 text-muted-foreground select-none">
                            {idx + 1}
                        </div>

                        {/* DIFF LINE */}
                        <div className="flex-1">
                            {line || " "}
                        </div>
                    </div>
                );
            })}
        </pre>
    );
}
