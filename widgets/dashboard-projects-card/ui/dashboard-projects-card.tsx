"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ChevronLeft, ChevronRight, FolderOpen, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListProjects } from "@/entities/project";

type TimeFilterValue = "all" | "7d" | "30d";

const PROJECTS_PER_PAGE = 3;
const PROJECTS_TIME_ANCHOR = typeof Date !== "undefined" ? Date.now() : 0;

const TIME_FILTER_OPTIONS: { value: TimeFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export function DashboardProjectsCard() {
  const router = useRouter();
  const { organizationId } = useParams<{ organizationId: string }>();

  const [projectPage, setProjectPage] = useState(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");

  const { data: projectsResponse, isLoading } = useListProjects(
    organizationId ?? ""
  );
  const projects = useMemo(() => projectsResponse?.data ?? [], [projectsResponse]);

  const filteredProjects = useMemo(() => {
    const now = PROJECTS_TIME_ANCHOR;
    let list = [...projects];

    if (timeFilter === "7d") {
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (p) => !p.createdAt || new Date(p.createdAt).getTime() >= cutoff
      );
    } else if (timeFilter === "30d") {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (p) => !p.createdAt || new Date(p.createdAt).getTime() >= cutoff
      );
    }

    list.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    return list;
  }, [projects, timeFilter]);

  const projectPageCount = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const safeProjectPage = Math.min(projectPage, Math.max(0, projectPageCount - 1));
  const visibleProjects = filteredProjects.slice(
    safeProjectPage * PROJECTS_PER_PAGE,
    safeProjectPage * PROJECTS_PER_PAGE + PROJECTS_PER_PAGE
  );

  const handleTimeFilterChange = (value: TimeFilterValue) => {
    setTimeFilter(value);
    setProjectPage(0);
  };

  return (
    <Card className="h-full rounded-2xl border-border bg-card">
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
              className="rounded-full border-[0.5px] border-border bg-accent-contrast text-muted"
              onClick={() => router.push(`/${organizationId}/projects/new-project`)}
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
                  className="rounded-full border-[0.5px] border-border bg-accent-contrast px-2 py-1 text-xs text-text"
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
          {isLoading ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Loading projects...
            </li>
          ) : visibleProjects.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No projects in this period
            </li>
          ) : (
            visibleProjects.map((project, i) => (
              <li
                key={safeProjectPage * PROJECTS_PER_PAGE + i}
                className="flex items-center justify-between gap-1"
              >
                <Link
                  href={`/${organizationId}/projects/${project.slug || project.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-accent-contrast/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FolderOpen className="size-8 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{project.name}</p>
                    <p className="truncate text-xs font-normal text-muted">
                      {project.createdAt
                        ? `Created on ${new Date(project.createdAt).toLocaleDateString()}`
                        : "Created recently"}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>

        {(projectPageCount > 1 || visibleProjects.length > 0) && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setProjectPage(Math.max(0, safeProjectPage - 1))}
              disabled={safeProjectPage <= 0}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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
                      d === safeProjectPage ? "bg-accent" : "bg-muted hover:bg-accent"
                    )}
                  />
                ))}
              </>
            )}

            <button
              type="button"
              onClick={() =>
                setProjectPage(Math.min(projectPageCount - 1, safeProjectPage + 1))
              }
              disabled={safeProjectPage >= projectPageCount - 1}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next projects"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardProjectsCard;
