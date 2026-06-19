"use client"

import React, { useState, useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PlusIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { PredefinedOrgRole } from "@/types/enum"

const PREDEFINED_ROLE_OPTIONS: Array<{ value: PredefinedOrgRole; label: string; hint: string }> = [
    { value: PredefinedOrgRole.OWNER, label: "Owner", hint: "Full control" },
    { value: PredefinedOrgRole.ADMIN, label: "Admin", hint: "Manage org + members" },
    { value: PredefinedOrgRole.CEO, label: "CEO", hint: "Executive view" },
    { value: PredefinedOrgRole.CTO, label: "CTO", hint: "Tech leadership" },
    { value: PredefinedOrgRole.DEVELOPER, label: "Developer", hint: "Read + write projects" },
    { value: PredefinedOrgRole.VIEWER, label: "Viewer", hint: "Read-only" },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type TeamInvitedMember = {
    id: string
    email: string
    name: string | null
    avatarUrl?: string | null
    role: string
    status: "pending" | "sent"
}

type TeamProps = {
    invitedMembers: TeamInvitedMember[]
    onAddMembers: (emails: string[]) => void
    onUpdateMemberRole: (memberId: string, role: string) => void
    onRemoveMember: (memberId: string) => void
    disabled?: boolean
}

const Team = ({
    invitedMembers,
    onAddMembers,
    onUpdateMemberRole,
    onRemoveMember,
    disabled = false,
}: TeamProps) => {
    const [emails, setEmails] = useState<string[]>([])
    const [inputValue, setInputValue] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const addEmail = (email: string) => {
        const trimmed = email.trim().toLowerCase()
        if (!trimmed || !EMAIL_REGEX.test(trimmed) || emails.includes(trimmed)) { return; }
        setEmails((prev) => [...prev, trimmed])
        setInputValue("")
    }

    const addEmailsFromCommaSeparated = (value: string): string => {
        const parts = value.split(",").map((p) => p.trim())
        if (parts.length <= 1) { return value; }
        const validNew: string[] = []
        const existingSet = new Set(emails)
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i].toLowerCase()
            if (part && EMAIL_REGEX.test(part) && !existingSet.has(part)) {
                validNew.push(part)
                existingSet.add(part)
            }
        }
        const remainder = parts[parts.length - 1] ?? ""
        setEmails((prev) => [...prev, ...validNew])
        return remainder
    }

    const removeEmail = (email: string) => {
        setEmails((prev) => prev.filter((e) => e !== email))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addEmail(inputValue)
        } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
            setEmails((prev) => prev.slice(0, -1))
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (value.includes(",")) {
            const remainder = addEmailsFromCommaSeparated(value)
            setInputValue(remainder)
        } else {
            setInputValue(value)
        }
    }

    const getEmailsToAdd = (): string[] => {
        const trimmed = inputValue.trim().toLowerCase()
        const fromInput =
            trimmed && EMAIL_REGEX.test(trimmed) && !emails.includes(trimmed)
                ? [trimmed]
                : []
        const existing = [...emails]
        return fromInput.length ? [...fromInput, ...existing] : existing
    }

    const handleAddToList = () => {
        const toAdd = getEmailsToAdd()
        if (toAdd.length === 0) { return; }
        const existingEmails = new Set(invitedMembers.map((m) => m.email))
        const newEmails = toAdd.filter((e) => !existingEmails.has(e))
        if (newEmails.length === 0) {
            setEmails([])
            setInputValue("");
            return;
        }
        onAddMembers(newEmails)
        setEmails([])
        setInputValue("")
    }

    const getInitial = (member: TeamInvitedMember) =>
        member.name?.[0]?.toUpperCase() ?? member.email?.[0]?.toUpperCase() ?? "?"

    return (
        <div className={cn(disabled && "pointer-events-none select-none opacity-50")}>
            <div className="space-y-4">
                <div className="">
                    <div className="flex items-center gap-4 w-full">
                        <div
                            className={cn(
                                "flex flex-wrap items-center gap-2 min-h-9 w-full rounded-xl border border-border bg-background px-2 py-1.5",
                                "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:border-ring"
                            )}
                            onClick={() => inputRef.current?.focus()}
                        >
                            {emails.map((email) => (
                                <span
                                    key={email}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#191b1b] dark:bg-card px-3 py-1 text-sm text-white"
                                >
                                    {email}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeEmail(email)
                                        }}
                                        className="rounded p-0.5 hover:bg-white/10 focus:outline-none text-red-500 cursor-pointer"
                                        aria-label={`Remove ${email}`}
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </span>
                            ))}
                            <input
                                ref={inputRef}
                                type="email"
                                placeholder={emails.length === 0 ? "Enter email address" : ""}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onBlur={() => {
                                    if (inputValue.trim()) { addEmail(inputValue); }
                                }}
                                disabled={disabled}
                                className="flex-1 min-w-0 sm:min-w-35 bg-transparent border-0 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-0"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleAddToList}
                            disabled={disabled}
                            className="shrink-0 bg-[rgba(200,255,62,0.80)] text-black rounded-full font-medium text-sm"
                        >
                            <PlusIcon />
                            Add Emails
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Separate multiple emails with a comma
                    </p>
                </div>

                {invitedMembers.length > 0 && (
                    <div className="space-y-1">
                        {invitedMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between gap-4 py-3 border-b border-[#33383B] last:border-0"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="size-6 shrink-0 bg-accent/20 text-accent">
                                        <AvatarImage src={member.avatarUrl ?? undefined} alt="" />
                                        <AvatarFallback className="bg-accent/20 text-accent text-sm font-medium">
                                            {getInitial(member)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground truncate">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Select
                                        value={member.role}
                                        onValueChange={(value) => onUpdateMemberRole(member.id, value)}
                                        disabled={member.status === "sent"}
                                    >
                                        <SelectTrigger
                                            size="sm"
                                            className="h-8 rounded-full border-border bg-transparent dark:bg-card text-text text-xs min-w-28 disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PREDEFINED_ROLE_OPTIONS.map((option) => (
                                                <Tooltip key={option.value}>
                                                    <TooltipTrigger asChild>
                                                        <SelectItem value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left">
                                                        <p>{option.hint}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {member.status === "pending" ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRemoveMember(member.id)}
                                            className="rounded-full border border-[#33383B] bg-transparent text-xs text-muted-foreground hover:text-red-500 hover:border-red-500/40"
                                            aria-label={`Remove ${member.email}`}
                                        >
                                            <X className="size-3.5" />
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Team
