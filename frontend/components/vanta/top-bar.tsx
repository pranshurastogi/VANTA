"use client"

import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { VantaLogo } from "@/components/vanta/logo"
import { cn } from "@/lib/utils"

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
  pendingCount?: number
  onBellClick?: () => void
}

export function TopBar({ title, pendingCount = 0, onBellClick }: TopBarProps) {
  return (
    <header className="sticky top-0 h-16 bg-vanta-bg/80 backdrop-blur-sm border-b border-border z-40">
      <div className="flex items-center justify-between h-full px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="md:hidden shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vanta-teal"
            aria-label="VANTA home"
          >
            <VantaLogo size={28} />
          </Link>
          <h1 className="font-mono text-xl font-medium text-foreground truncate">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <IndicatorPill label="AI Scanner" value="Active" color="green" />
            <IndicatorPill label="Policy" value="7 rules" color="teal" />
            <IndicatorPill label="World ID" value="Verified" color="green" showCheck />
          </div>

          {/* Bell icon with pending count */}
          <button
            onClick={onBellClick}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-lg border transition-colors",
              pendingCount > 0
                ? "border-vanta-amber/50 bg-vanta-amber/10 text-vanta-amber hover:bg-vanta-amber/20"
                : "border-border bg-vanta-surface text-vanta-text-muted hover:text-foreground hover:border-border-hover"
            )}
          >
            <Bell size={16} />
            <AnimatePresence>
              {pendingCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-vanta-amber text-vanta-bg text-[10px] font-bold"
                >
                  {pendingCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  )
}
