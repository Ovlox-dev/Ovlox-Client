export function dateFormatter(
    isoDate: string,
    locale: string = "en-GB"
): string {
    if (!isoDate) return "";

    const date = new Date(isoDate);

    return date.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}