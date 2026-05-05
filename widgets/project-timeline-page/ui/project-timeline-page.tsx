"use client";

// The standalone Timeline route reuses the events-page widget — same data, same layout.
// This separate widget exists so the route can later diverge with deeper filters / export
// without touching the in-project events tab.
export { ProjectEventsPage as ProjectTimelinePage } from "@/widgets/project-events-page/ui/project-events-page";
