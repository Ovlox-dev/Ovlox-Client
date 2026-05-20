"use client";

import { useMemo } from "react";

interface Bucket {
    date: string; // 'YYYY-MM-DD'
    count: number;
}

interface Cell {
    date: Date;
    iso: string;
    count: number;
    intensity: number; // 0..4
}

export interface ContributionHeatmapProps {
    /** Array of `{ date: 'YYYY-MM-DD', count }` from the backend. Days with
     *  zero contributions can be omitted — anything missing is rendered as 0. */
    data: Bucket[];
    /** Number of days going back from today to render. Defaults to 365. */
    days?: number;
    /** Optional className on the outer wrapper. */
    className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * GitHub-style contribution heatmap. 7-row × N-col grid.
 *
 * Columns are weeks (left = oldest, right = today). Rows are days of week
 * (Sun → Sat top to bottom). Intensity is bucketed into 5 levels driven by
 * the maximum daily count in the window so a quiet week still shows
 * gradation rather than every cell being the lightest shade.
 */
export function ContributionHeatmap({
    data,
    days = 365,
    className,
}: ContributionHeatmapProps) {
    const { weeks, monthTicks, totalCount, maxCount } = useMemo(
        () => buildGrid(data, days),
        [data, days]
    );

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-(--fg-2)">
                    <span className="font-semibold text-(--fg) tabular-nums">
                        {totalCount.toLocaleString()}
                    </span>{" "}
                    contribution{totalCount === 1 ? "" : "s"} in the last {days}{" "}
                    days
                </p>
                <Legend />
            </div>

            <div className="overflow-x-auto">
                <div className="inline-flex flex-col gap-1.5 min-w-full">
                    {/* Month labels along the top */}
                    <div className="flex gap-[3px] pl-7">
                        {weeks.map((_, weekIdx) => (
                            <div
                                key={weekIdx}
                                className="w-3 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)"
                            >
                                {monthTicks[weekIdx] ?? ""}
                            </div>
                        ))}
                    </div>

                    {/* Day labels (left) + week columns */}
                    <div className="flex gap-1.5">
                        <div className="flex flex-col gap-[3px] text-[10px] font-mono text-(--fg-3) shrink-0">
                            {DAY_LABELS.map((label, i) => (
                                <span
                                    key={label}
                                    // show every other day-of-week label to avoid clutter
                                    className={`h-3 leading-3 ${i % 2 === 0 ? "" : "invisible"}`}
                                >
                                    {label.slice(0, 3)}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-[3px]">
                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[3px]">
                                    {week.map((cell, dayIdx) =>
                                        cell ? (
                                            <Cell key={dayIdx} cell={cell} maxCount={maxCount} />
                                        ) : (
                                            <div
                                                key={dayIdx}
                                                aria-hidden
                                                className="size-3"
                                            />
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Cell({ cell, maxCount }: { cell: Cell; maxCount: number }) {
    const tooltip = `${cell.iso} · ${cell.count} contribution${cell.count === 1 ? "" : "s"}`;
    const cls = cellClass(cell.intensity);
    return (
        <div
            title={tooltip}
            aria-label={tooltip}
            data-count={cell.count}
            data-max={maxCount}
            className={`size-3 rounded-[3px] border border-(--line-2)/40 ${cls}`}
        />
    );
}

function Legend() {
    return (
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-3)">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((i) => (
                <span
                    key={i}
                    className={`size-3 rounded-[3px] border border-(--line-2)/40 ${cellClass(i)}`}
                />
            ))}
            <span>More</span>
        </div>
    );
}

function cellClass(intensity: number): string {
    switch (intensity) {
        case 0:
            return "bg-(--bg-3)";
        case 1:
            return "bg-[rgba(124,246,111,0.18)]";
        case 2:
            return "bg-[rgba(124,246,111,0.4)]";
        case 3:
            return "bg-[rgba(200,255,62,0.55)]";
        case 4:
        default:
            return "bg-(--accent-lime)";
    }
}

function buildGrid(data: Bucket[], days: number) {
    const counts = new Map<string, number>();
    for (const b of data) counts.set(b.date, b.count);

    // Anchor today at UTC midnight so date strings line up with the backend.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (days - 1) * DAY_MS);

    // Pad start backwards to the previous Sunday so the grid has aligned columns.
    const startDow = start.getUTCDay();
    const gridStart = new Date(start.getTime() - startDow * DAY_MS);
    const totalCells = Math.ceil(
        (today.getTime() - gridStart.getTime()) / DAY_MS
    ) + 1;
    const numWeeks = Math.ceil(totalCells / 7);

    let max = 0;
    let totalCount = 0;
    const weeks: Array<Array<Cell | null>> = [];
    const monthTicks: Record<number, string> = {};
    let lastMonth = -1;

    for (let w = 0; w < numWeeks; w++) {
        const week: Array<Cell | null> = [];
        for (let d = 0; d < 7; d++) {
            const offset = w * 7 + d;
            const date = new Date(gridStart.getTime() + offset * DAY_MS);
            // Skip cells before the actual window start or after today.
            if (date < start || date > today) {
                week.push(null);
                continue;
            }
            const iso = date.toISOString().slice(0, 10);
            const count = counts.get(iso) ?? 0;
            if (count > max) max = count;
            totalCount += count;
            week.push({
                date,
                iso,
                count,
                intensity: 0, // backfilled below once we know max
            });

            // First Sunday of a new month gets the month label above its column.
            if (d === 0 && date.getUTCMonth() !== lastMonth) {
                monthTicks[w] = MONTH_LABELS[date.getUTCMonth()];
                lastMonth = date.getUTCMonth();
            }
        }
        weeks.push(week);
    }

    // Quantize counts into 5 buckets driven by the daily max.
    const denom = Math.max(1, max);
    for (const week of weeks) {
        for (const cell of week) {
            if (!cell) continue;
            if (cell.count === 0) {
                cell.intensity = 0;
            } else {
                const ratio = cell.count / denom;
                cell.intensity = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
            }
        }
    }

    return { weeks, monthTicks, totalCount, maxCount: max };
}
