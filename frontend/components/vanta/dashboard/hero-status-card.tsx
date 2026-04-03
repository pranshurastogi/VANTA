"use client"

import { motion } from "framer-motion"
import { AnimatedNumber } from "../animated-number"

interface HeroStatusCardProps {
  volumeProtected: number
  threatsBlocked: number
  autoApproved: number
  agentsConnected: number
  lastScan: string
}

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-vanta-teal" />
    </span>
  )
}

export function HeroStatusCard({
  volumeProtected,
  threatsBlocked,
  autoApproved,
  agentsConnected,
  lastScan,
}: HeroStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-vanta-surface border border-border rounded-xl p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left side - Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PulsingDot />
            <span className="font-mono text-sm font-medium text-vanta-teal">
              DAEMON ACTIVE
            </span>
          </div>
          <p className="text-[13px] text-vanta-text-secondary">
            Monitoring {agentsConnected} connected agents
          </p>
          <p className="text-xs text-vanta-text-muted">
            Last scan: {lastScan}
          </p>
        </div>

        {/* Right side - Metrics */}
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-vanta-text-secondary">24h Volume Protected</span>
            <span className="font-mono text-2xl text-foreground">
              <AnimatedNumber value={volumeProtected} prefix="$" decimals={2} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-vanta-text-secondary">Threats Blocked</span>
            <span className="font-mono text-lg text-vanta-red">
              <AnimatedNumber value={threatsBlocked} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-vanta-text-secondary">Auto-approved</span>
            <span className="font-mono text-lg text-vanta-teal">
              <AnimatedNumber value={autoApproved} />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
