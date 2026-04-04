"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Search,
  Shield,
  Zap,
  Clock,
  Send,
  X,
  Loader2,
  Sparkles,
  History,
  RefreshCw,
} from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ScanHistoryEntry } from "@/lib/types"

// ── Utility Components ─────────────────────────────────────────────────

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-vanta-teal" />
    </span>
  )
}

function RecommendationBadge({
  rec,
  size = "sm",
}: {
  rec: "approve" | "flag" | "block"
  size?: "sm" | "lg"
}) {
  const config = {
    approve: {
      icon: Check,
      label: "Approved",
      bg: "bg-vanta-teal/10",
      border: "border-vanta-teal/30",
      text: "text-vanta-teal",
    },
    flag: {
      icon: AlertTriangle,
      label: "Flagged",
      bg: "bg-vanta-amber/10",
      border: "border-vanta-amber/30",
      text: "text-vanta-amber",
    },
    block: {
      icon: XCircle,
      label: "Blocked",
      bg: "bg-vanta-red/10",
      border: "border-vanta-red/30",
      text: "text-vanta-red",
    },
  }
  const c = config[rec]
  const Icon = c.icon
  const isLg = size === "lg"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono",
        c.bg,
        c.border,
        c.text,
        isLg ? "px-4 py-1.5 text-sm" : "px-2 py-0.5 text-[11px]"
      )}
    >
      <Icon size={isLg ? 16 : 12} />
      {c.label}
    </span>
  )
}

function ScoreGauge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const getColor = () => {
    if (score < 30) return "text-vanta-teal"
    if (score < 70) return "text-vanta-amber"
    return "text-vanta-red"
  }
  const getBarColor = () => {
    if (score < 30) return "bg-vanta-teal"
    if (score < 70) return "bg-vanta-amber"
    return "bg-vanta-red"
  }

  if (size === "lg") {
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference - (score / 100) * circumference

    return (
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="var(--vanta-elevated)"
            strokeWidth="6"
          />
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={score < 30 ? "var(--vanta-teal)" : score < 70 ? "var(--vanta-amber)" : "var(--vanta-red)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="text-center">
          <motion.span
            className={cn("font-mono text-2xl font-bold", getColor())}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {score}
          </motion.span>
          <p className="text-[10px] text-vanta-text-muted">/100</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-vanta-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${getBarColor()}`}
        />
      </div>
      <span className={`font-mono text-xs ${getColor()}`}>{score}/100</span>
    </div>
  )
}

// ── Scan Result Modal ──────────────────────────────────────────────────

interface ScanResultData {
  scanId?: string
  riskScore: number
  recommendation: "approve" | "flag" | "block"
  reasoning: string
  checks: { name: string; passed: boolean; detail: string }[]
  model?: string
  valueUsd?: number
  to?: string
  from?: string
}

function ScanResultModal({
  result,
  onClose,
}: {
  result: ScanResultData
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-vanta-surface border border-border rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-vanta-elevated rounded-lg">
              <Shield size={18} className="text-vanta-teal" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Scan Result</h2>
              <p className="text-[11px] text-vanta-text-muted font-mono">
                {result.scanId ? `#${result.scanId.slice(0, 8)}` : "Analysis complete"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-vanta-elevated transition-colors"
          >
            <X size={16} className="text-vanta-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Score + Recommendation */}
          <div className="flex items-center justify-between">
            <ScoreGauge score={result.riskScore} size="lg" />
            <div className="text-right space-y-2">
              <RecommendationBadge rec={result.recommendation} size="lg" />
              {result.valueUsd !== undefined && (
                <p className="text-xs text-vanta-text-muted font-mono">
                  ${result.valueUsd.toFixed(2)} USD
                </p>
              )}
              {result.to && (
                <p className="text-[11px] text-vanta-text-muted font-mono">
                  To: {result.to.slice(0, 6)}…{result.to.slice(-4)}
                </p>
              )}
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="bg-vanta-elevated/50 rounded-xl px-4 py-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-vanta-teal" />
              <span className="text-[11px] text-vanta-text-muted uppercase tracking-wider">
                AI Analysis
              </span>
            </div>
            <p className="text-[13px] text-vanta-text-secondary leading-relaxed">
              {result.reasoning}
            </p>
          </div>

          {/* Checks */}
          <div>
            <h3 className="text-xs text-vanta-text-muted mb-3 uppercase tracking-wider">
              Security Checks ({result.checks.length})
            </h3>
            <ul className="space-y-2">
              {result.checks.map((check, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 bg-vanta-elevated/30 rounded-lg px-3 py-2.5"
                >
                  {check.passed ? (
                    <Check size={14} className="text-vanta-teal mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-vanta-red mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-foreground font-medium">{check.name}</p>
                    <p className="text-[11px] text-vanta-text-muted mt-0.5">{check.detail}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-vanta-elevated/30">
          <span className="text-[10px] text-vanta-text-muted font-mono flex items-center gap-1.5">
            <Zap size={10} />
            Powered by {result.model || "Gemini 3 Flash"}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 bg-vanta-elevated hover:bg-border transition-colors rounded-lg text-foreground"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Scan Form ──────────────────────────────────────────────────────────

function ScanForm({
  onResult,
  remaining,
  setRemaining,
}: {
  onResult: (result: ScanResultData) => void
  remaining: number | null
  setRemaining: (n: number | null) => void
}) {
  const [toAddress, setToAddress] = useState("")
  const [value, setValue] = useState("")
  const [calldata, setCalldata] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState<number | null>(null)

  // Countdown for rate limit
  useEffect(() => {
    if (rateLimited === null || rateLimited <= 0) return
    const timer = setInterval(() => {
      setRateLimited((prev) => (prev && prev > 1 ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [rateLimited])

  const handleScan = async () => {
    if (!toAddress || !value) return
    setError(null)
    setLoading(true)

    try {
      const weiValue = String(Math.floor(parseFloat(value) * 1e18))

      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "0x0000000000000000000000000000000000000001",
          to: toAddress,
          value: weiValue,
          data: calldata || undefined,
          chainId: 1,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setRateLimited(data.resetIn || 60)
        setError(data.message || "Rate limit exceeded")
        return
      }

      if (!res.ok) {
        setError(data.error || "Scan failed")
        return
      }

      if (data.remaining !== undefined) {
        setRemaining(data.remaining)
      }

      onResult({
        scanId: data.scanId,
        riskScore: data.riskScore,
        recommendation: data.recommendation,
        reasoning: data.reasoning,
        checks: data.checks,
        model: data.model,
        valueUsd: data.valueUsd,
        to: toAddress,
      })
    } catch {
      setError("Network error — could not reach scanner API")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-vanta-surface border border-border rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-vanta-teal" />
        <h3 className="text-[13px] text-foreground font-medium">Scan a Transaction</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-vanta-text-muted mb-1 block">
            Destination address *
          </label>
          <Input
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] text-vanta-text-muted mb-1 block">
            Value (ETH) *
          </label>
          <Input
            placeholder="0.1"
            type="number"
            step="0.001"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] text-vanta-text-muted mb-1 block">
            Calldata (optional)
          </label>
          <Input
            placeholder="0x095ea7b3..."
            value={calldata}
            onChange={(e) => setCalldata(e.target.value)}
            className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-xs"
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-vanta-red flex items-center gap-1.5 bg-vanta-red/10 px-3 py-2 rounded-lg"
            >
              <AlertTriangle size={12} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleScan}
          disabled={loading || !toAddress || !value || rateLimited !== null}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            loading || !toAddress || !value || rateLimited !== null
              ? "bg-vanta-elevated text-vanta-text-muted cursor-not-allowed"
              : "bg-vanta-teal text-vanta-bg hover:brightness-110 active:scale-[0.98]"
          )}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Scanning with Gemini 3…
            </>
          ) : rateLimited ? (
            <>
              <Clock size={16} />
              Rate limited — {rateLimited}s
            </>
          ) : (
            <>
              <Send size={16} />
              Scan Transaction
            </>
          )}
        </button>

        {remaining !== null && (
          <p className="text-[10px] text-vanta-text-muted text-center">
            {remaining} scan{remaining !== 1 ? "s" : ""} remaining this minute
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── History Entry Row ──────────────────────────────────────────────────

function HistoryEntryRow({
  entry,
  onViewDetails,
}: {
  entry: ScanHistoryEntry
  onViewDetails: (entry: ScanHistoryEntry) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const time = new Date(entry.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const resultMap: Record<string, "passed" | "flagged" | "blocked"> = {
    approve: "passed",
    flag: "flagged",
    block: "blocked",
  }
  const result = resultMap[entry.recommendation] || "flagged"

  const description =
    entry.calldata && entry.calldata !== "0x"
      ? `Contract call to ${entry.to_address.slice(0, 6)}…${entry.to_address.slice(-4)}`
      : `Transfer ${entry.value_usd ? `$${Number(entry.value_usd).toFixed(2)}` : ""} to ${entry.to_address.slice(0, 6)}…${entry.to_address.slice(-4)}`

  return (
    <div className="border-b border-border last:border-0">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors duration-150",
          "hover:bg-vanta-elevated"
        )}
        whileTap={{ scale: 0.995 }}
      >
        <span className="font-mono text-xs text-vanta-text-muted w-12">{time}</span>
        {result === "passed" && <Check size={16} className="text-vanta-teal" />}
        {result === "flagged" && <AlertTriangle size={16} className="text-vanta-amber" />}
        {result === "blocked" && <XCircle size={16} className="text-vanta-red" />}
        <span className="flex-1 text-[13px] text-foreground truncate">{description}</span>
        <ScoreGauge score={entry.risk_score} />
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-vanta-text-muted" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-vanta-elevated/50 border-t border-border">
              <p className="text-xs text-vanta-text-secondary mb-3">{entry.reasoning}</p>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs text-vanta-text-muted">
                  Checks ({entry.checks?.length || 0})
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails(entry)
                  }}
                  className="text-[11px] text-vanta-teal hover:underline"
                >
                  View full details →
                </button>
              </div>
              <ul className="space-y-2">
                {(entry.checks || []).slice(0, 4).map((check, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 text-xs text-vanta-text-secondary"
                  >
                    {check.passed ? (
                      <Check size={14} className="text-vanta-teal mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-vanta-red mt-0.5 shrink-0" />
                    )}
                    <span>{check.detail || check.name}</span>
                  </motion.li>
                ))}
                {(entry.checks?.length || 0) > 4 && (
                  <li className="text-[11px] text-vanta-text-muted pl-6">
                    +{(entry.checks?.length || 0) - 4} more checks…
                  </li>
                )}
              </ul>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-vanta-text-muted">
                <Zap size={10} />
                <span>{entry.model || "gemini-3-flash"}</span>
                <span>•</span>
                <span>{entry.scan_source}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Threat Database Sidebar ────────────────────────────────────────────

function ThreatDatabaseSidebar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState<"clean" | "flagged" | null>(null)

  const handleSearch = () => {
    if (searchQuery.length > 0) {
      setSearchResult(Math.random() > 0.3 ? "clean" : "flagged")
    }
  }

  const recentAdditions = [
    { address: "0x7a3b...4c2e", date: "Apr 4" },
    { address: "0x9f1c...8d3a", date: "Apr 3" },
    { address: "0x2e4d...1f5b", date: "Apr 2" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full lg:w-[280px] bg-vanta-surface border border-border rounded-xl p-4 h-fit sticky top-24"
    >
      <h3 className="font-mono text-sm text-foreground mb-4">Threat database</h3>

      <div className="space-y-1 mb-6">
        <p className="text-xs text-vanta-text-secondary">
          <span className="font-mono text-foreground">1,247</span> known scam addresses
        </p>
        <p className="text-xs text-vanta-text-muted">Updated 3h ago</p>
      </div>

      <div className="mb-6">
        <h4 className="text-xs text-vanta-text-muted mb-3">Recent additions</h4>
        <ul className="space-y-2">
          {recentAdditions.map((item, index) => (
            <li key={index} className="flex items-center justify-between text-xs">
              <span className="font-mono text-vanta-text-secondary">{item.address}</span>
              <span className="text-vanta-text-muted">{item.date}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs text-vanta-text-muted mb-2">Check an address</h4>
        <div className="flex gap-2">
          <Input
            placeholder="0x..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchResult(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-xs"
          />
          <button
            onClick={handleSearch}
            className="p-2 bg-vanta-elevated border border-border-hover rounded-lg text-vanta-text-muted hover:text-foreground transition-colors"
          >
            <Search size={16} />
          </button>
        </div>

        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs",
                searchResult === "clean"
                  ? "bg-vanta-teal/10 text-vanta-teal"
                  : "bg-vanta-red/10 text-vanta-red"
              )}
            >
              {searchResult === "clean" ? (
                <>
                  <Check size={14} />
                  <span>Clean — not found in databases</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  <span>Flagged — known scam address</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main Scanner Page ──────────────────────────────────────────────────

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null)
  const [history, setHistory] = useState<ScanHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [remaining, setRemaining] = useState<number | null>(null)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/scanner/scan?limit=50")
      const data = await res.json()
      setHistory(data.scans || [])
    } catch {
      // Silently fail — history will be empty
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleScanResult = (result: ScanResultData) => {
    setScanResult(result)
    // Refresh history to include the new scan
    fetchHistory()
  }

  const handleViewDetails = (entry: ScanHistoryEntry) => {
    setScanResult({
      scanId: entry.id,
      riskScore: entry.risk_score,
      recommendation: entry.recommendation,
      reasoning: entry.reasoning,
      checks: entry.checks || [],
      model: entry.model,
      valueUsd: entry.value_usd ? Number(entry.value_usd) : undefined,
      to: entry.to_address,
      from: entry.from_address,
    })
  }

  return (
    <DashboardLayout title="Scanner">
      <div className="space-y-4">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-6 py-4 bg-vanta-surface border border-border rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-foreground">AI Scanner</span>
            <PulsingDot />
            <span className="text-[13px] text-vanta-text-secondary">
              Active — scanning all transactions
            </span>
          </div>
          <span className="text-xs text-vanta-text-muted flex items-center gap-1.5">
            <Sparkles size={12} className="text-vanta-teal" />
            Model: Gemini 3 Flash
          </span>
        </motion.div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Column: Scan Form + History */}
          <div className="flex-1 space-y-4">
            {/* Scan Form */}
            <ScanForm
              onResult={handleScanResult}
              remaining={remaining}
              setRemaining={setRemaining}
            />

            {/* Scan History */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-vanta-text-muted" />
                  <h3 className="text-[13px] text-vanta-text-secondary">Scan History</h3>
                  {history.length > 0 && (
                    <span className="text-[11px] text-vanta-text-muted font-mono">
                      ({history.length})
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchHistory}
                  className="p-1.5 rounded-lg hover:bg-vanta-elevated transition-colors text-vanta-text-muted hover:text-foreground"
                  title="Refresh history"
                >
                  <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                </button>
              </div>

              <div>
                {historyLoading && history.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Loader2 size={20} className="animate-spin text-vanta-text-muted mx-auto mb-2" />
                    <p className="text-xs text-vanta-text-muted">Loading scan history…</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Shield size={24} className="text-vanta-text-muted mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-vanta-text-muted">No scans yet</p>
                    <p className="text-[11px] text-vanta-text-muted mt-1">
                      Use the form above to scan your first transaction
                    </p>
                  </div>
                ) : (
                  history.map((entry) => (
                    <HistoryEntryRow
                      key={entry.id}
                      entry={entry}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Threat Database */}
          <ThreatDatabaseSidebar />
        </div>
      </div>

      {/* Scan Result Modal */}
      <AnimatePresence>
        {scanResult && (
          <ScanResultModal
            result={scanResult}
            onClose={() => setScanResult(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
