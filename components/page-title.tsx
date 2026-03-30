export const PageTitle = ({ title, description }: { title: string, description: string }) => {
    return (
        <div>
            <h1 className="text-3xl font-semibold text-text">{title}</h1>
            <p className="text-muted text-sm mt-1">
                {description}
            </p>
        </div>
    )
}