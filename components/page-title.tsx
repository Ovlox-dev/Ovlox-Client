import { Skeleton } from "./ui/skeleton"

export const PageTitle = ({
    title,
    description,
    isLoading,
}: {
    title: string
    description: string
    isLoading?: boolean
}) => {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-48 bg-(--bg-3)" />
                <Skeleton className="h-4 w-72 bg-(--bg-3)" />
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-semibold tracking-tight text-(--fg) leading-tight">
                {title}
            </h1>
            <p className="text-sm mt-1.5 text-(--fg-2) max-w-2xl">
                {description}
            </p>
        </div>
    )
}
