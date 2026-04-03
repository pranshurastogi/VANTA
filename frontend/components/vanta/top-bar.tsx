"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { VantaLogo } from "@/components/vanta/logo"

interface IndicatorPillProps {
  label: string
  value: string
  color: "teal" | "green"
  showCheck?: boolean
}

function IndicatorPill({ label, value, color, showCheck }: IndicatorPillProps) {
  const dotColor = color === "teal" ? "bg-vanta-teal" : "bg-vanta-teal"
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vanta-surface border border-border">
      {showCheck ? (
        <Check size={12} className="text-vanta-teal" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} pulse-dot`} />
      )}
      <span className="text-xs text-vanta-text-secondary">
        {label}: <span className="text-vanta-text-primary">{value}</span>
      </span>
    </div>
  )
}

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 h-16 bg-vanta-bg/80 backdrop-blur-sm border-b border-border z-40">
      <div className="flex items-center justify-between h-full px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="md:hidden shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vanta-teal"
            aria-label="VANTA home"
          >
            <VantaLogo size={28} />
          </Link>
          <h1 className="font-mono text-xl font-medium text-foreground truncate">
            {title}
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <IndicatorPill label="AI Scanner" value="Active" color="green" />
          <IndicatorPill label="Policy" value="7 rules" color="teal" />
          <IndicatorPill label="World ID" value="Verified" color="green" showCheck />
        </div>
      </div>
    </header>
  )
}
