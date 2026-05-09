"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "dark" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      icons={{
        success: <CircleCheckIcon className="size-4 text-(--accent-2)" />,
        info: <InfoIcon className="size-4 text-(--info)" />,
        warning: <TriangleAlertIcon className="size-4 text-(--warn)" />,
        error: <OctagonXIcon className="size-4 text-(--danger)" />,
        loading: <Loader2Icon className="size-4 animate-spin text-(--accent-lime)" />,
      }}
      style={
        {
          "--normal-bg": "var(--bg-2)",
          "--normal-text": "var(--fg)",
          "--normal-border": "var(--line)",
          "--success-bg": "rgba(124, 246, 111, 0.1)",
          "--success-border": "rgba(124, 246, 111, 0.3)",
          "--success-text": "var(--accent-2)",
          "--error-bg": "rgba(255, 91, 110, 0.1)",
          "--error-border": "rgba(255, 91, 110, 0.3)",
          "--error-text": "var(--danger)",
          "--border-radius": "10px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
