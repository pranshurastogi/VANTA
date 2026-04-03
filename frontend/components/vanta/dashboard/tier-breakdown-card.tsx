"use client"

import { motion } from "framer-motion"

interface TierBreakdownCardProps {
  tier1Count: number
  tier2Count: number
  tier3Count: number
}

interface TierBarProps {
  label: string
  count: number
  total: number
  color: string
  delay: number
}

function TierBar({ label, count, total, color, delay }: TierBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-vanta-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-vanta-text-muted">{count} txns</span>
          <span className="font-mono text-vanta-text-primary">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-vanta-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, delay, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export function TierBreakdownCard({ tier1Count, tier2Count, tier3Count }: TierBreakdownCardProps) {
  const total = tier1Count + tier2Count + tier3Count

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-vanta-surface border border-border rounded-xl p-6 h-[180px] flex flex-col"
    >
      <h3 className="text-[13px] text-vanta-text-secondary mb-4">Transaction tiers</h3>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <TierBar
          label="Tier 1 (auto)"
          count={tier1Count}
          total={total}
          color="bg-vanta-teal"
          delay={0.2}
        />
        <TierBar
          label="Tier 2 (confirm)"
          count={tier2Count}
          total={total}
          color="bg-vanta-amber"
          delay={0.3}
        />
        <TierBar
          label="Tier 3 (blocked)"
          count={tier3Count}
          total={total}
          color="bg-vanta-red"
          delay={0.4}
        />
      </div>
    </motion.div>
  )
}
