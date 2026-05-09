import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-(--fg) placeholder:text-(--fg-3) selection:bg-(--accent-lime) selection:text-[#07070a]",
        "h-10 w-full min-w-0 rounded-[10px] border border-(--line) bg-(--bg) text-(--fg) px-3.5 py-2 text-sm",
        "transition-[border-color,box-shadow,background] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-(--line) hover:bg-(--bg-2)",
        "focus-visible:border-(--accent-lime) focus-visible:bg-(--bg-2) focus-visible:ring-[3px] focus-visible:ring-[rgba(200,255,62,0.12)]",
        "aria-invalid:border-(--danger) aria-invalid:ring-[rgba(255,91,110,0.18)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
