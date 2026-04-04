"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  XCircle,
  X,
  Copy,
  Shield,
  ShieldOff,
  Fingerprint,
} from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { StatusBadge } from "@/components/vanta/status-badge"
import { Transaction } from "@/lib/types"
import { mockTransactions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/useUser"
import { useRealtimeTransactions } from "@/hooks/useRealtimeTransactions"

// ── db → ui adapter (mirrors dashboard) ──────────────────────────────────────

function dbTxToUiTx(tx: ReturnType<typeof useRealtimeTransactions>["transactions"][number]): Transaction {
  const eth = Number(tx.value) / 1e18
  const usd = tx.value_usd ?? eth * 2400
  const statusMap: Record<string, Transaction["status"]> = {
    approved: "approved",
    confirmed: "confirmed",
    blocked: "blocked",
    rejected: "blocked",
    pending: "confirmed",
  }
  const tierMap: Record<number, Transaction["tier"]> = { 1: "auto", 2: "confirmed", 3: "blocked" }
  return {
    id: tx.id,
    status: statusMap[tx.status] ?? "approved",
    description: tx.calldata
      ? `Contract call → ${tx.to_address.slice(0, 8)}…`
      : `Transfer → ${tx.to_address.slice(0, 8)}…`,
    agent: tx.agent_id ? "AI Agent" : "Manual",
    amount: `$${usd.toFixed(2)}`,
    amountUsd: usd,
    time: new Date(tx.created_at).toLocaleTimeString(),
    tier: tierMap[tx.tier] ?? "auto",
    to: tx.to_address,
    from: tx.from_address,
    network:
      tx.chain_id === 11155111 ? "Sepolia"
      : tx.chain_id === 1 ? "Ethereum Mainnet"
      : `Chain ${tx.chain_id}`,
    aiAssessment:
      tx.risk_score != null
        ? {
            riskScore: tx.risk_score,
            riskLevel: tx.risk_score < 30 ? "low" : tx.risk_score < 70 ? "medium" : "high",
            checks: (tx.scan_checks ?? []).map((c) => ({ label: c.detail, passed: c.passed })),
          }
        : undefined,
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function tierColor(tier: Transaction["tier"]) {
  if (tier === "auto") return "text-emerald-400"
  if (tier === "confirmed") return "text-amber-400"
  return "text-red-400"
}

function tierDot(tier: Transaction["tier"]) {
  if (tier === "auto") return "bg-emerald-400"
  if (tier === "confirmed") return "bg-amber-400"
  return "bg-red-400"
}

function riskBarColor(score: number) {
  if (score < 30) return "bg-emerald-400"
  if (score < 70) return "bg-amber-400"
  return "bg-red-400"
}

function riskLabel(score: number) {
  if (score < 30) return "Low risk"
  if (score < 70) return "Medium risk"
  return "High risk"
}

function TxIcon({ tier }: { tier: Transaction["tier"] }) {
  if (tier === "auto") return <Check size={14} className="text-emerald-400" />
  if (tier === "confirmed") return <Shield size={14} className="text-amber-400" />
  return <ShieldOff size={14} className="text-red-400" />
}

// ── risk bar ─────────────────────────────────────────────────────────────────

function RiskBar({ score }: { score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className={cn("font-medium", score < 30 ? "text-emerald-400" : score < 70 ? "text-amber-400" : "text-red-400")}>
          {riskLabel(score)}
        </span>
        <span className="text-muted-foreground font-mono">{score}/100</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", riskBarColor(score))}
        />
      </div>
    </div>
  )
}

// ── detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const tierLabel =
    tx.tier === "auto" ? "Auto approved" : tx.tier === "confirmed" ? "Confirmed" : "Blocked"

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="p-6 space-y-6"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", {
            "border-emerald-400/30 bg-emerald-400/10": tx.tier === "auto",
            "border-amber-400/30 bg-amber-400/10": tx.tier === "confirmed",
            "border-red-400/30 bg-red-400/10": tx.tier === "blocked",
          })}>
            <TxIcon tier={tx.tier} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{tx.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">via {tx.agent}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Amount + tier */}
      <div className="flex items-center justify-between border-b border-dashed border-border pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Amount</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">{tx.amount}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tier</p>
          <div className="flex items-center gap-1.5 justify-end">
            <span className={cn("h-1.5 w-1.5 rounded-full", tierDot(tx.tier))} />
            <span className={cn("text-sm font-medium", tierColor(tx.tier))}>{tierLabel}</span>
          </div>
        </div>
      </div>

      {/* Chain details */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Chain details</p>
        <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
          {[
            { label: "From", value: tx.from ?? "—", key: "from", mono: true, action: tx.from ? () => copy(tx.from!, "from") : undefined },
            { label: "To", value: tx.to ?? "—", key: "to", mono: true, verified: tx.contractVerified, action: tx.to ? () => copy(tx.to!, "to") : undefined },
            { label: "Network", value: tx.network ?? "—", key: "network", mono: false },
            { label: "Gas", value: tx.gas ?? "—", key: "gas", mono: true },
            { label: "Time", value: tx.time, key: "time", mono: false },
            { label: "Ref", value: `#${tx.id}`, key: "id", mono: true },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{row.label}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("text-xs text-foreground truncate", row.mono && "font-mono")}>
                  {row.value}
                </span>
                {"verified" in row && row.verified !== undefined && (
                  row.verified
                    ? <Shield size={11} className="text-emerald-400 shrink-0" />
                    : <ShieldOff size={11} className="text-muted-foreground shrink-0" />
                )}
                {row.action && (
                  <button onClick={row.action} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                    {copied === row.key
                      ? <Check size={11} className="text-emerald-400" />
                      : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI assessment */}
      {tx.aiAssessment && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="space-y-3 border-t border-dashed border-border pt-5"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI scanner</p>
          <RiskBar score={tx.aiAssessment.riskScore} />
          <ul className="space-y-2 pt-1">
            {tx.aiAssessment.checks.map((check, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs">
                {check.passed
                  ? <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  : <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />}
                <span className={cn(check.passed ? "text-muted-foreground" : "text-foreground")}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Tier 2 actions */}
      {tx.tier === "confirmed" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="border-t border-dashed border-border pt-5 space-y-2"
        >
          <Button className="w-full h-9 border border-emerald-400/50 bg-transparent text-emerald-400 hover:bg-emerald-400/10 transition-colors text-xs">
            <Fingerprint size={14} className="mr-2" />
            Approve
          </Button>
          <button className="w-full text-center text-xs text-red-400 hover:underline">
            Reject
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── transaction row ───────────────────────────────────────────────────────────

function TxRow({ tx, isSelected, onSelect }: {
  tx: Transaction
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <motion.div
      layoutId={`tx-${tx.id}`}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-150",
        isSelected
          ? "bg-accent/50 border border-border"
          : "hover:bg-accent border border-transparent"
      )}
      whileTap={{ scale: 0.995 }}
    >
      <motion.div
        layoutId={`icon-${tx.id}`}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          tx.tier === "auto" && "border-emerald-400/30 bg-emerald-400/10",
          tx.tier === "confirmed" && "border-amber-400/30 bg-amber-400/10",
          tx.tier === "blocked" && "border-red-400/30 bg-red-400/10"
        )}
        transition={{ duration: 0.4 }}
      >
        <TxIcon tier={tx.tier} />
      </motion.div>

      <div className="min-w-0 flex-1">
        <motion.p layoutId={`desc-${tx.id}`} className="text-sm font-medium text-foreground truncate">
          {tx.description}
        </motion.p>
        <motion.p layoutId={`agent-${tx.id}`} className="text-xs text-muted-foreground mt-0.5">
          {tx.agent} · {tx.time}
        </motion.p>
      </div>

      <motion.p layoutId={`amount-${tx.id}`} className="shrink-0 text-sm font-mono font-semibold text-foreground">
        {tx.amount}
      </motion.p>

      <span className={cn("h-2 w-2 shrink-0 rounded-full", tierDot(tx.tier))} />
    </motion.div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [selected, setSelected] = useState<Transaction | null>(null)
  const { user } = useUser()
  const { transactions: dbTxs } = useRealtimeTransactions(user?.id)

  // Prefer live DB data; fall back to mock when the user has no on-chain history yet
  const transactions: Transaction[] =
    dbTxs.length > 0 ? dbTxs.map(dbTxToUiTx) : mockTransactions

  return (
    <DashboardLayout title="Transactions">
      <div className="flex gap-5 h-full">

        {/* Left — list */}
        <motion.div
          layout
          className={cn(
            "flex flex-col rounded-2xl border border-border bg-background overflow-hidden transition-all duration-500",
            selected ? "w-full md:w-[420px] shrink-0" : "w-full"
          )}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="text-base font-semibold text-muted-foreground">Transactions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{transactions.length} entries</p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {transactions.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                isSelected={selected?.id === tx.id}
                onSelect={() => setSelected(selected?.id === tx.id ? null : tx)}
              />
            ))}
          </div>
        </motion.div>

        {/* Right — detail panel (desktop) */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              className="hidden md:flex flex-1 flex-col rounded-2xl border border-border bg-background overflow-y-auto"
            >
              <DetailPanel tx={selected} onClose={() => setSelected(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile overlay */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center p-4 md:hidden"
              onClick={() => setSelected(null)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <DetailPanel tx={selected} onClose={() => setSelected(null)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
