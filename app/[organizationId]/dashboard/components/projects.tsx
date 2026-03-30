import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FolderOpen } from 'lucide-react';

type TimeFilterValue = "all" | "7d" | "30d";
const PROJECTS_PER_PAGE = 3;
const PROJECTS_TIME_ANCHOR = typeof Date !== "undefined" ? Date.now() : 0;

const PROJECTS = [
    { title: "Backend Dev", updates: 12, timeStamp: new Date("2026-01-15") },
    { title: "Frontend App", updates: 8, timeStamp: new Date("2026-02-14") },
    { title: "API Gateway", updates: 5, timeStamp: new Date("2026-03-13") },
    { title: "Database", updates: 5, timeStamp: new Date("2025-10-12") },
    { title: "Authentication", updates: 5, timeStamp: new Date("2025-10-11") },
    { title: "CI/CD", updates: 5, timeStamp: new Date("2025-10-10") },
];

const TIME_FILTER_OPTIONS: { value: TimeFilterValue; label: string }[] = [
    { value: "all", label: "All" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
];


const Projects = () => {
    const [projectPage, setProjectPage] = useState(0);
    const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");

    const handleTimeFilterChange = (value: TimeFilterValue) => {
        setTimeFilter(value);
        setProjectPage(0);
    };

    const filteredProjects = useMemo(() => {
        const now = PROJECTS_TIME_ANCHOR;
        let list = [...PROJECTS];
        if (timeFilter === "7d") {
            const cutoff = now - 7 * 24 * 60 * 60 * 1000;
            list = list.filter((p) => p.timeStamp.getTime() >= cutoff);
        } else if (timeFilter === "30d") {
            const cutoff = now - 30 * 24 * 60 * 60 * 1000;
            list = list.filter((p) => p.timeStamp.getTime() >= cutoff);
        }
        list.sort((a, b) => b.timeStamp.getTime() - a.timeStamp.getTime());
        return list;
    }, [timeFilter]);

    const projectPageCount = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
    const safeProjectPage = Math.min(projectPage, Math.max(0, projectPageCount - 1));
    const visibleProjects = filteredProjects.slice(
        safeProjectPage * PROJECTS_PER_PAGE,
        safeProjectPage * PROJECTS_PER_PAGE + PROJECTS_PER_PAGE
    );

    return (
        <div>
            <Card className="rounded-2xl border-border bg-card">
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-base font-semibold text-muted">Active Projects</p>
                            <span className="text-4xl font-semibold text-accent">
                                {filteredProjects.length}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="bg-accent-contrast rounded-full text-muted border-[0.5px] border-border  "
                            >
                                <Plus />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={timeFilter}
                                    onValueChange={(v) => handleTimeFilterChange(v as TimeFilterValue)}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="text-xs text-text rounded-full bg-accent-contrast border-[0.5px] border-border px-2 py-1"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_FILTER_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <ul className="space-y-3 rounded-md bg-background px-2 py-1">
                        {visibleProjects.length === 0 ? (
                            <li className="py-6 text-center text-sm text-muted-foreground">
                                No projects in this period
                            </li>
                        ) : (
                            visibleProjects.map((project, i) => (
                                <li
                                    key={safeProjectPage * PROJECTS_PER_PAGE + i}
                                    className="flex items-center justify-between gap-1"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FolderOpen className="size-8 shrink-0 text-muted" />
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-text">
                                                {project.title}
                                            </p>
                                            <p className="truncate text-xs font-normal text-muted">
                                                {project.updates} updates on {project.timeStamp.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="border-[0.5px] border-accent bg-background text-xs text-accent shrink-0">
                                        Manage
                                    </Button>
                                </li>
                            ))
                        )}
                    </ul>
                    {(projectPageCount > 1 || visibleProjects.length > 0) && (
                        <div className="flex justify-center items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setProjectPage(Math.max(0, safeProjectPage - 1))}
                                disabled={safeProjectPage <= 0}
                                className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous projects"
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            {projectPageCount > 1 && (
                                <>
                                    {Array.from({ length: projectPageCount }).map((_, d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setProjectPage(d)}
                                            aria-label={`Go to projects page ${d + 1}`}
                                            className={cn(
                                                "size-1.5 rounded-full transition-colors",
                                                d === safeProjectPage
                                                    ? "bg-accent"
                                                    : "bg-muted hover:bg-accent"
                                            )}
                                        />
                                    ))}
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => setProjectPage(Math.min(projectPageCount - 1, safeProjectPage + 1))}
                                disabled={safeProjectPage >= projectPageCount - 1}
                                className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next projects"
                            >
                                <ChevronRight className="size-5" />
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default Projects