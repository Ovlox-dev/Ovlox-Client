import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-(--fg-3) text-(--fg)",
        "flex field-sizing-content min-h-20 w-full rounded-[10px] border border-(--line) bg-(--bg) px-3.5 py-2.5 text-sm",
        "transition-[border-color,box-shadow,background] outline-none",
        "hover:border-(--line) hover:bg-(--bg-2)",
        "focus-visible:border-(--accent-lime) focus-visible:bg-(--bg-2) focus-visible:ring-[3px] focus-visible:ring-[rgba(200,255,62,0.12)]",
        "aria-invalid:border-(--danger) aria-invalid:ring-[rgba(255,91,110,0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
