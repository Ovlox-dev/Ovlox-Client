"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

/**
 * Wraps recharts' `<ResponsiveContainer>` so it only mounts after the parent
 * element has a measured non-zero width.
 *
 * Why: `<ResponsiveContainer width="100%">` measures its parent imperatively
 * the moment it mounts. If the parent is still in the middle of its first
 * layout pass (common inside grids with `min-w-0` cells), the measurement
 * comes back as 0 and recharts logs:
 *
 *   "The width(-1) and height(-1) of chart should be greater than 0,
 *    please check the style of container..."
 *
 * The chart eventually renders correctly once the layout settles, but the
 * console fills with warnings on every page transition.
 *
 * Solution: gate the `<ResponsiveContainer>` mount on a `ResizeObserver`
 * measurement of the wrapping `<div>`. Until the wrapper has a real width,
 * we render nothing — recharts is never asked for an impossible measurement.
 *
 * Usage is identical to ResponsiveContainer; pass the chart component as a
 * single child:
 *
 *   <MeasuredChart height={300}>
 *     <BarChart data={...}>...</BarChart>
 *   </MeasuredChart>
 */
export function MeasuredChart({
    children,
    height,
    minHeight = 1,
    className,
}: {
    children: React.ReactElement;
    height?: number | string;
    /** Mount the chart only when the wrapper exceeds this many pixels of
     *  width. Default of 1 px filters out the 0/-1 sentinel without
     *  artificially delaying rendering. */
    minHeight?: number;
    className?: string;
}) {
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const [hasSize, setHasSize] = React.useState(false);

    React.useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                if (w > minHeight) {
                    setHasSize(true);
                    return;
                }
            }
        });
        observer.observe(el);

        // Synchronously check the initial size — if the parent already had
        // dimensions when this effect ran, we don't need to wait for the
        // first ResizeObserver callback.
        if (el.clientWidth > minHeight) {
            setHasSize(true);
        }

        return () => observer.disconnect();
    }, [minHeight]);

    return (
        <div
            ref={wrapperRef}
            className={className}
            style={{ width: "100%", height: typeof height === "number" ? `${height}px` : height }}
        >
            {hasSize ? (
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            ) : null}
        </div>
    );
}
