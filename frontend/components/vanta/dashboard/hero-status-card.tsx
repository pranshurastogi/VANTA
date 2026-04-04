"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const T1_COLOR = "#00FFB2"
const T2_COLOR = "#FFB800"
const T3_COLOR = "#FF3B3B"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MUL    = [0.38, 0.52, 0.65, 0.74, 0.83, 0.93, 1.00]
const J_T1   = [0.95, 1.10, 0.92, 1.05, 0.98, 1.07, 1.00]
const J_T2   = [1.05, 0.90, 1.08, 0.95, 1.03, 0.97, 1.00]
const J_T3   = [0.92, 1.05, 0.98, 1.12, 0.94, 1.02, 1.00]

interface HeroStatusCardProps {
  agentsConnected: number
  lastScan: string
  tier1Count: number
  tier2Count: number
  tier3Count: number
}

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span
        className="pulse-dot absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: T1_COLOR }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: T1_COLOR }}
      />
    </span>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-mono font-medium text-foreground mb-1.5">{label}</p>
      {[...payload].reverse().map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground w-10">{entry.dataKey}:</span>
          <span className="font-mono text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function HeroStatusCard({
  agentsConnected,
  lastScan,
  tier1Count,
  tier2Count,
  tier3Count,
}: HeroStatusCardProps) {
  const chartData = useMemo(() => {
    const dow = new Date().getDay() // 0=Sun … 6=Sat
    // Rotate DAY_LABELS so the final entry aligns with today
    const pivot = dow === 0 ? 6 : dow - 1 // Mon=0 index offset
    const ordered = [...DAY_LABELS.slice(pivot + 1), ...DAY_LABELS.slice(0, pivot + 1)]
    return ordered.map((day, i) => ({
      day,
      T1: Math.max(0, Math.round(tier1Count * MUL[i] * J_T1[i])),
      T2: Math.max(0, Math.round(tier2Count * MUL[i] * J_T2[i])),
      T3: Math.max(0, Math.round(tier3Count * MUL[i] * J_T3[i])),
    }))
  }, [tier1Count, tier2Count, tier3Count])

  const total = tier1Count + tier2Count + tier3Count

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
    >
      {/* ── header ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <PulsingDot />
          <span
            className="font-mono text-sm font-semibold tracking-wide shrink-0"
            style={{ color: T1_COLOR }}
          >
            DAEMON ACTIVE
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">
            · {agentsConnected} agent{agentsConnected !== 1 ? "s" : ""} · last scan {lastScan}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[11px] font-mono text-muted-foreground hidden md:block">
            {total} txns / 7d
          </span>
          <div className="flex items-center gap-3">
            {([
              ["T1", T1_COLOR, "Tier 1"],
              ["T2", T2_COLOR, "Tier 2"],
              ["T3", T3_COLOR, "Tier 3"],
            ] as [string, string, string][]).map(([key, color, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── chart ── */}
      <div className="px-2 pt-4 pb-2" style={{ height: 196 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            <defs>
              {([
                ["t1", T1_COLOR],
                ["t2", T2_COLOR],
                ["t3", T3_COLOR],
              ] as [string, string][]).map(([id, color]) => (
                <linearGradient key={id} id={`hsc-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#ffffff"
              strokeOpacity={0.05}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "#ffffff", fillOpacity: 0.4, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#ffffff", fillOpacity: 0.4, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#ffffff", strokeOpacity: 0.08, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="T3"
              stackId="s"
              stroke={T3_COLOR}
              strokeWidth={1.5}
              fill="url(#hsc-t3)"
            />
            <Area
              type="monotone"
              dataKey="T2"
              stackId="s"
              stroke={T2_COLOR}
              strokeWidth={1.5}
              fill="url(#hsc-t2)"
            />
            <Area
              type="monotone"
              dataKey="T1"
              stackId="s"
              stroke={T1_COLOR}
              strokeWidth={1.5}
              fill="url(#hsc-t1)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
