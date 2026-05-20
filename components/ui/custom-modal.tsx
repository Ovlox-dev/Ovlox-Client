"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CustomModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
    className?: string
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
}

const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full"
}

export function CustomModal({
    open,
    onOpenChange,
    children,
    className,
    maxWidth = "2xl"
}: CustomModalProps) {
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [open])

    if (!open) { return null; }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => onOpenChange(false)}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
                    "animate-in fade-in-0 zoom-in-95 duration-300",
                    maxWidthClasses[maxWidth],
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    )
}

export function CustomModalHeader({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex items-start justify-between p-6 border-b border-border bg-muted/30", className)}>
            {children}
        </div>
    )
}

export function CustomModalTitle({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return <h2 className={cn("text-xl font-semibold", className)}>{children}</h2>
}

export function CustomModalDescription({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return <p className={cn("text-sm text-muted-foreground mt-1", className)}>{children}</p>
}

export function CustomModalClose({
    onClose,
    className
}: {
    onClose: () => void
    className?: string
}) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full", className)}
            onClick={onClose}
        >
            <X className="size-4" />
        </Button>
    )
}

export function CustomModalBody({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("p-6 max-h-[calc(90vh-200px)] overflow-y-auto", className)}>
            {children}
        </div>
    )
}

export function CustomModalFooter({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30", className)}>
            {children}
        </div>
    )
}
