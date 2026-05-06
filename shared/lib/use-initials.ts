import { useMemo } from "react";

type GetInitialsOptions = {
    maxInitials?: number;
    fallback?: string;
};

export function getInitials(
    name?: string,
    options: GetInitialsOptions = {}
): string {
    const { maxInitials = 2, fallback = "?" } = options;

    if (!name) { return fallback; }

    const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, maxInitials)
        .join("");

    return initials || fallback;
}


export function useInitials(
    name?: string,
    options?: GetInitialsOptions
) {
    return useMemo(
        () => getInitials(name, options),
        [name, options]
    ) as string;
}