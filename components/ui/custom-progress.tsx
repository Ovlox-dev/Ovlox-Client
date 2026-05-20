"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CircularProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
    shape?: "square" | "round";
    className?: string;
    progressClassName?: string;
    showLabel?: boolean;
}

const CircularProgress = ({
    value,
    className,
    progressClassName,
    showLabel = true,
    shape = "round",
    size = 100,
    strokeWidth = 15,
}: CircularProgressProps) => {
    const radius = size / 2 - 10;
    const circumference = Math.ceil(3.14 * radius * 2);
    const percentage = Math.ceil(circumference * ((100 - value) / 100));

    const viewBox = `-${size * 0.125} -${size * 0.125} ${size * 1.25} ${size * 1.25
        }`;

    return (
        <div className="relative">
            <svg
                className="relative h-16 w-16"
                height={size}
                style={{ transform: "rotate(-90deg)" }}
                version="1.1"
                viewBox={viewBox}
                width={size}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Base Circle */}
                <circle
                    className={cn("stroke-accent-contrast", className)}
                    cx={size / 2}
                    cy={size / 2}
                    fill="transparent"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset="0"
                    strokeWidth={strokeWidth}
                />

                {/* Progress */}
                <circle
                    className={cn("stroke-primary", progressClassName)}
                    cx={size / 2}
                    cy={size / 2}
                    fill="transparent"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={percentage}
                    strokeLinecap={shape}
                    strokeWidth={strokeWidth}
                />
            </svg>
            {showLabel && (
                <div
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Check 
                    strokeWidth={3.5}
                    className="size-8 text-primary bg-accent-contrast rounded-full p-2" />
                </div>
            )}
        </div>
    );
};

export default CircularProgress;
