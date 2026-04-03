"use client"

import { cn } from "@/lib/utils"

type BadgeVariant = "auto" | "confirmed" | "blocked" | "safe" | "risk" | "warning"

interface StatusBadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  auto: "bg-vanta-teal/10 text-vanta-teal",
  safe: "bg-vanta-teal/10 text-vanta-teal",
  confirmed: "bg-vanta-amber/10 text-vanta-amber",
  warning: "bg-vanta-amber/10 text-vanta-amber",
  blocked: "bg-vanta-red/10 text-vanta-red",
  risk: "bg-vanta-red/10 text-vanta-red",
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
