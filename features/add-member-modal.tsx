"use client"

import React, { KeyboardEvent, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { inviteMember, listInvites } from "@/shared/api/org"
import { PredefinedOrgRole } from "@/types/enum"
import { useQuery } from "@tanstack/react-query"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AddMemberModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    onInvited?: () => void
}

function AddMemberModal({
    open,
    onOpenChange,
    organizationId,
    onInvited,

}: AddMemberModalProps) {
    const [emails, setEmails] = useState<string[]>([])
    const [inputValue, setInputValue] = useState("")
    const [role, setRole] = useState<PredefinedOrgRole>(PredefinedOrgRole.DEVELOPER)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)

    const canSubmit = useMemo(() => {
        const trimmed = inputValue.trim().toLowerCase()
        const hasValidInput = trimmed.length > 0 && EMAIL_REGEX.test(trimmed) && !emails.includes(trimmed)
        return emails.length > 0 || hasValidInput
    }, [emails, inputValue])

    const addEmail = (email: string) => {
        const trimmed = email.trim().toLowerCase()
        if (!trimmed || !EMAIL_REGEX.test(trimmed) || emails.includes(trimmed)) return
        setEmails((prev) => [...prev, trimmed])
        setInputValue("")
    }

    const addEmailsFromCommaSeparated = (value: string): string => {
        const parts = value.split(",").map((p) => p.trim())
        if (parts.length <= 1) return value

        const validNew: string[] = []
        const existingSet = new Set(emails)
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]?.toLowerCase() ?? ""
            if (part && EMAIL_REGEX.test(part) && !existingSet.has(part)) {
                validNew.push(part)
                existingSet.add(part)
            }
        }

        const remainder = parts[parts.length - 1] ?? ""
        if (validNew.length) setEmails((prev) => [...prev, ...validNew])
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

    const getEmailsToInvite = (): string[] => {
        const trimmed = inputValue.trim().toLowerCase()
        const fromInput =
            trimmed && EMAIL_REGEX.test(trimmed) && !emails.includes(trimmed) ? [trimmed] : []
        return fromInput.length ? [...fromInput, ...emails] : [...emails]
    }

    const reset = () => {
        setEmails([])
        setInputValue("")
        setError(null)
        setSubmitting(false)
        setRole(PredefinedOrgRole.DEVELOPER)
    }

    const { refetch: invitesRefetch } = useQuery({
        queryKey: ["orgInvites", organizationId],
        queryFn: async () => {
            const res = await listInvites(organizationId, { limit: 200 })
            return res?.data ?? []
        },
    })

    const handleInvite = async () => {
        if (!organizationId) {
            setError("Missing organization id.")
            return
        }
        const toInvite = getEmailsToInvite()
        if (toInvite.length === 0) return

        setSubmitting(true)
        setError(null)
        try {
            await Promise.all(
                toInvite.map((email) =>
                    inviteMember(organizationId, { email, predefinedRole: role })
                )
            )
            await invitesRefetch()
            onInvited?.()
            reset()
            onOpenChange(false)
        } catch (e: unknown) {
            const message =
                e instanceof Error
                    ? e.message
                    : typeof e === "string"
                        ? e
                        : "Failed to invite members."
            setError(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen)
                if (!nextOpen) reset()
            }}
        >
            <DialogContent className="sm:max-w-xl rounded-2xl border-border bg-card">
                <DialogHeader>
                    <DialogTitle className="text-text">Add members</DialogTitle>
                    <DialogDescription>
                        Invite people to your workspace. Separate multiple emails with a comma.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm text-muted font-medium">Invite via email</Label>
                        <div className="flex items-start gap-3 w-full">
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
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#191b1b] dark:bg-card px-3 py-1 text-sm text-accent"
                                    >
                                        {email}
                                        <button
                                            type="button"
                                            onClick={(ev) => {
                                                ev.stopPropagation()
                                                removeEmail(email)
                                            }}
                                            className="rounded p-0.5 hover:bg-white/10 focus:outline-none"
                                            aria-label={`Remove ${email}`}
                                        >
                                            <X className="size-3.5 hover:text-red-500" />
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
                                        if (inputValue.trim()) addEmail(inputValue)
                                    }}
                                    className="flex-1 min-w-40 bg-transparent border-0 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm text-muted font-medium">Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as PredefinedOrgRole)}>
                            <SelectTrigger className="h-9 rounded-full border-border bg-transparent dark:bg-card text-text text-xs w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={PredefinedOrgRole.ADMIN}>Admin</SelectItem>
                                <SelectItem value={PredefinedOrgRole.DEVELOPER}>Developer</SelectItem>
                                <SelectItem value={PredefinedOrgRole.VIEWER}>Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="rounded-full"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleInvite}
                        disabled={!canSubmit || submitting}
                        className="rounded-full bg-accent text-card font-medium text-sm hover:bg-[#4fb8e8]"
                    >
                        {submitting ? "Inviting..." : "Send invites"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AddMemberModal