"use client"

import React from "react"
import { Search as SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchProps = React.ComponentProps<typeof Input> & {
    placeholder?: string
    handleSearch?: (value: string) => void
}

function Search({ placeholder = "Search...", className, handleSearch }: SearchProps) {
    return (
        <div className={cn("relative flex-1  rounded-md", className)}>
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
                type="search"
                placeholder={placeholder}
                className="pl-10  dark:bg-card dark:border-[0.5px] dark:border-border"
                onChange={(e) => handleSearch?.(e.target.value)}
            />
        </div>
    )
}

export default Search
