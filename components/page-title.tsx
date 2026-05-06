import { Skeleton } from "./ui/skeleton"

export const PageTitle = ({ title, description, isLoading }: { title: string, description: string, isLoading?: boolean }) => {
    return (
        <div>
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-40" />
                </div>
            ) : (
                <>
                    <h1 className="text-3xl font-semibold text-text">{title}</h1>
                    <p className="text-muted text-sm mt-1">
                        {description}
                    </p>
                </>
            )}
        </div>
    )
}