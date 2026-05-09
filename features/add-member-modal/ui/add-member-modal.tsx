"use client"

import React, { KeyboardEvent, useMemo, useRef, useState } from "react"
import { X, Loader2, Mail, Sparkles } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { inviteMember, listInvites } from "@/entities/organization/api/org"
import { listOrgRoles, type CustomRoleTemplate } from "@/entities/role"
import { PredefinedOrgRole } from "@/types/enum"
import type { InviteMemberRequest } from "@/types/api-types"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The select stores the selected role as a discriminated string so we can
 * round-trip both predefined enum values and custom role UUIDs through one
 * Radix Select component. Format:
 *   - `predef:DEVELOPER` → send `{ predefinedRole: 'DEVELOPER' }`
 *   - `custom:<uuid>`    → send `{ roleId: '<uuid>' }`
 */
type RoleValue = `predef:${PredefinedOrgRole}` | `custom:${string}`;

const PREDEFINED_OPTIONS: Array<{ value: PredefinedOrgRole; label: string; hint: string }> = [
    { value: PredefinedOrgRole.OWNER, label: "Owner", hint: "Full control" },
    { value: PredefinedOrgRole.ADMIN, label: "Admin", hint: "Manage org + members" },
    { value: PredefinedOrgRole.CEO, label: "CEO", hint: "Executive view" },
    { value: PredefinedOrgRole.CTO, label: "CTO", hint: "Tech leadership" },
    { value: PredefinedOrgRole.DEVELOPER, label: "Developer", hint: "Read + write projects" },
    { value: PredefinedOrgRole.VIEWER, label: "Viewer", hint: "Read-only" },
]

type AddMemberModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
}

function AddMemberModal({
    open,
    onOpenChange,
    organizationId,
}: AddMemberModalProps) {
    const [emails, setEmails] = useState<string[]>([])
    const [inputValue, setInputValue] = useState("")
    const [roleValue, setRoleValue] = useState<RoleValue>(`predef:${PredefinedOrgRole.DEVELOPER}`)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)

    /**
     * Org roles for this workspace. The backend returns BOTH the predefined
     * roles (for completeness) and the org's custom role templates with
     * their permissions joined in. We only use `customRoles` here because
     * the predefined options are already hard-coded in PREDEFINED_OPTIONS
     * with concise hint copy. If the user lacks MANAGE_ROLES they'll get a
     * 403 — we treat that as "no custom roles visible" and silently degrade
     * to predefined only (invite itself only needs INVITE_MEMBERS).
     */
    const customRolesQuery = useQuery({
        queryKey: ["orgRoles", organizationId],
        queryFn: async (): Promise<CustomRoleTemplate[]> => {
            try {
                const res = await listOrgRoles(organizationId)
                return res?.customRoles ?? []
            } catch {
                return []
            }
        },
        enabled: open && !!organizationId,
        staleTime: 60_000,
    })
    const customRoles = customRolesQuery.data ?? []

    const canSubmit = useMemo(() => {
        const trimmed = inputValue.trim().toLowerCase()
        const hasValidInput = trimmed.length > 0 && EMAIL_REGEX.test(trimmed) && !emails.includes(trimmed)
        return emails.length > 0 || hasValidInput
    }, [emails, inputValue])

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
            const part = parts[i]?.toLowerCase() ?? ""
            if (part && EMAIL_REGEX.test(part) && !existingSet.has(part)) {
                validNew.push(part)
                existingSet.add(part)
            }
        }

        const remainder = parts[parts.length - 1] ?? ""
        if (validNew.length) { setEmails((prev) => [...prev, ...validNew]); }
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
        setRoleValue(`predef:${PredefinedOrgRole.DEVELOPER}`)
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
        if (toInvite.length === 0) { return; }

        // Decode the discriminated select value into the right invite payload.
        const inviteBase: Pick<InviteMemberRequest, "predefinedRole" | "roleId"> = roleValue.startsWith("custom:")
            ? { roleId: roleValue.slice("custom:".length) }
            : { predefinedRole: roleValue.slice("predef:".length) as PredefinedOrgRole }

        setSubmitting(true)
        setError(null)
        try {
            await Promise.all(
                toInvite.map((email) =>
                    inviteMember(organizationId, { email, ...inviteBase })
                )
            )
            await invitesRefetch()
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
                if (!nextOpen) { reset(); }
            }}
        >
            <DialogContent className="sm:max-w-xl rounded-[14px] border-(--line) bg-(--bg-2) p-0 overflow-hidden">
                {/* Frame titlebar (matches the v3 frame-card aesthetic) */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-(--line-2) bg-linear-to-b from-[#181820] to-[#131319]">
                    <div className="flex gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#ff5b6e]" />
                        <span className="size-2.5 rounded-full bg-[#ffb84d]" />
                        <span className="size-2.5 rounded-full bg-[#61d670]" />
                    </div>
                    <span className="ml-2 px-3 py-1 rounded-md bg-(--bg-3) text-(--fg) text-xs font-mono">
                        invite-members.tsx
                    </span>
                </div>

                <div className="p-6">
                    <DialogHeader>
                        <DialogTitle className="text-(--fg)">Add members</DialogTitle>
                        <DialogDescription className="text-(--fg-2)">
                            Invite people to your workspace. Separate multiple emails with a comma.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 mt-5">
                        {/* EMAILS */}
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-(--fg-3)">
                                <Mail className="inline size-3 mr-1" />
                                Invite via email
                            </Label>
                            <div
                                className={cn(
                                    "flex flex-wrap items-center gap-2 min-h-10 w-full rounded-[10px]",
                                    "border border-(--line) bg-(--bg) px-2 py-1.5",
                                    "transition-colors cursor-text",
                                    "focus-within:border-(--accent-lime) focus-within:bg-(--bg-2)",
                                    "focus-within:ring-[3px] focus-within:ring-[rgba(200,255,62,0.12)]"
                                )}
                                onClick={() => inputRef.current?.focus()}
                            >
                                {emails.map((email) => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-(--bg-3) border border-(--line-2) px-2 py-1 text-xs text-(--fg) font-mono"
                                    >
                                        {email}
                                        <button
                                            type="button"
                                            onClick={(ev) => {
                                                ev.stopPropagation()
                                                removeEmail(email)
                                            }}
                                            className="rounded p-0.5 text-(--fg-3) hover:text-(--danger) transition-colors"
                                            aria-label={`Remove ${email}`}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={inputRef}
                                    type="email"
                                    placeholder={emails.length === 0 ? "you@company.com" : ""}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => {
                                        if (inputValue.trim()) { addEmail(inputValue); }
                                    }}
                                    className="flex-1 min-w-40 bg-transparent border-0 py-1 text-sm text-(--fg) placeholder:text-(--fg-3) outline-none focus:ring-0"
                                />
                            </div>
                            <p className="text-[11px] text-(--fg-3) font-mono">
                                Press Enter or comma to add another address.
                            </p>
                        </div>

                        {/* ROLE */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-mono uppercase tracking-wider text-(--fg-3)">
                                    <Sparkles className="inline size-3 mr-1" />
                                    Role
                                </Label>
                                {customRolesQuery.isLoading ? (
                                    <span className="text-[10px] font-mono text-(--fg-3) inline-flex items-center gap-1">
                                        <Loader2 className="size-3 animate-spin" />
                                        loading custom roles
                                    </span>
                                ) : customRoles.length > 0 ? (
                                    <span className="text-[10px] font-mono text-(--fg-3)">
                                        {customRoles.length} custom + {PREDEFINED_OPTIONS.length} default
                                    </span>
                                ) : null}
                            </div>
                            <Select
                                value={roleValue}
                                onValueChange={(v) => setRoleValue(v as RoleValue)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel className="font-mono uppercase tracking-wider text-[10px] text-(--fg-3) px-2 py-1.5">
                                            Default
                                        </SelectLabel>
                                        {PREDEFINED_OPTIONS.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={`predef:${opt.value}`}
                                            >
                                                <span className="flex items-center justify-between gap-3 w-full">
                                                    <span className="font-medium">{opt.label}</span>
                                                    <span className="text-[10px] font-mono text-(--fg-3)">
                                                        {opt.hint}
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>

                                    {customRoles.length > 0 ? (
                                        <>
                                            <SelectSeparator />
                                            <SelectGroup>
                                                <SelectLabel className="font-mono uppercase tracking-wider text-[10px] text-(--accent-lime) px-2 py-1.5">
                                                    Custom · this org
                                                </SelectLabel>
                                                {customRoles.map((role) => {
                                                    const permCount = role.rolePermissions?.length ?? 0
                                                    return (
                                                        <SelectItem
                                                            key={role.id}
                                                            value={`custom:${role.id}`}
                                                        >
                                                            <span className="flex items-center justify-between gap-3 w-full">
                                                                <span className="font-medium">
                                                                    {role.name}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-(--fg-3)">
                                                                    {permCount} perm
                                                                    {permCount === 1 ? "" : "s"}
                                                                </span>
                                                            </span>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectGroup>
                                        </>
                                    ) : null}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && (
                            <div className="rounded-[10px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.06)] px-3 py-2">
                                <p className="text-sm text-(--danger)">{error}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleInvite}
                            disabled={!canSubmit || submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Inviting…
                                </>
                            ) : (
                                "Send invites"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AddMemberModal
