import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--accent-lime) text-[#07070a] font-semibold [a&]:hover:bg-(--accent-lime)/90",
        secondary:
          "border border-(--line-2) bg-(--bg-3) text-(--fg-2) [a&]:hover:bg-(--bg-2)",
        destructive:
          "border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.14)] text-(--danger) [a&]:hover:bg-[rgba(255,91,110,0.2)]",
        outline:
          "border border-(--line) text-(--fg-2) [a&]:hover:bg-(--bg-3) [a&]:hover:text-(--fg)",
        success:
          "border border-[rgba(124,246,111,0.3)] bg-[rgba(124,246,111,0.14)] text-(--accent-2) font-mono uppercase tracking-wider text-[10px]",
        warn:
          "border border-[rgba(255,138,61,0.3)] bg-[rgba(255,138,61,0.14)] text-(--warn) font-mono uppercase tracking-wider text-[10px]",
        info:
          "border border-[rgba(111,182,255,0.3)] bg-[rgba(111,182,255,0.14)] text-(--info) font-mono uppercase tracking-wider text-[10px]",
        mono:
          "border border-(--line-2) bg-(--bg-3) text-(--fg-3) font-mono uppercase tracking-wider text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
