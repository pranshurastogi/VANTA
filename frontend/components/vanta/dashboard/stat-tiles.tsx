"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { AnimatedNumber } from "../animated-number"

// ── trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ value, invertColor = false }: { value: number; invertColor?: boolean }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
        <Minus size={10} />
        <span>0%</span>
      </span>
    )
  }
  const isUp = value > 0
  // invertColor = true means "up is bad" (e.g. threats blocked increasing)
  const positive = invertColor ? !isUp : isUp
  const color = positive ? "#00FFB2" : "#FF3B3B"
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium"
      style={{ color }}
    >
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      <span>
        {isUp ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    </span>
  )
}

// ── single tile ───────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  trend: number
  invertTrend?: boolean
  accentColor: string
  delay?: number
}

function StatTile({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  trend,
  invertTrend,
  accentColor,
  delay = 0,
}: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-vanta-surface border border-border rounded-xl p-5 flex flex-col gap-2.5"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium leading-none">
        {label}
      </p>
      <div className="flex items-end justify-between gap-2">
        <span
          className="text-[2rem] font-mono font-semibold tracking-tight leading-none tabular-nums"
          style={{ color: accentColor }}
        >
          <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        </span>
        <div className="pb-0.5">
          <TrendBadge value={trend} invertColor={invertTrend} />
        </div>
      </div>
      <div className="h-px w-full bg-border opacity-60" />
      <p className="text-[10px] text-muted-foreground">vs yesterday</p>
    </motion.div>
  )
}

// ── exported grid ─────────────────────────────────────────────────────────────

interface StatTilesProps {
  volumeProtected: number
  threatsBlocked: number
  autoApproved: number
  pendingCount: number
}

// Deterministic trends derived from the chart's day-5 → day-6 ratio.
// MUL[5]=0.93, MUL[6]=1.00 → base Δ ≈ +7.5%; per-metric jitter applied.
const TREND_VOLUME  =  +7.5
const TREND_THREATS =  +3.2   // threats "blocked" increasing means more danger detected — shown neutral
const TREND_AUTO    =  +9.1   // automation rate improvement
const TREND_PENDING =   0

export function StatTiles({
  volumeProtected,
  threatsBlocked,
  autoApproved,
  pendingCount,
}: StatTilesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatTile
        label="Volume Protected"
        value={volumeProtected}
        prefix="$"
        decimals={2}
        trend={TREND_VOLUME}
        accentColor="#00FFB2"
        delay={0.05}
      />
      <StatTile
        label="Threats Blocked"
        value={threatsBlocked}
        trend={TREND_THREATS}
        invertTrend
        accentColor="#FF3B3B"
        delay={0.1}
      />
      <StatTile
        label="Auto-approved"
        value={autoApproved}
        trend={TREND_AUTO}
        accentColor="#00FFB2"
        delay={0.15}
      />
      <StatTile
        label="Pending Review"
        value={pendingCount}
        trend={TREND_PENDING}
        accentColor="#FFB800"
        delay={0.2}
      />
    </div>
  )
}
