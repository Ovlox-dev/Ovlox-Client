export function LoaderSpinner() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="animate-spin h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
    );
}