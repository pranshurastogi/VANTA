"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertTriangle, XCircle, ChevronDown, X, Copy, Shield, Fingerprint } from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { StatusBadge } from "@/components/vanta/status-badge"
import { Transaction } from "@/lib/types"
import { mockTransactions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function StatusIcon({ status }: { status: Transaction["status"] }) {
  switch (status) {
    case "approved":
      return <Check size={16} className="text-vanta-teal" />
    case "confirmed":
      return <AlertTriangle size={16} className="text-vanta-amber" />
    case "blocked":
      return <XCircle size={16} className="text-vanta-red" />
  }
}

function RiskMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score < 30) return "bg-vanta-teal"
    if (score < 70) return "bg-vanta-amber"
    return "bg-vanta-red"
  }

  return (
    <div className="relative w-full h-1.5 bg-vanta-elevated rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.5 }}
        className={`h-full rounded-full ${getColor()}`}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"
        style={{ left: `${score}%`, transform: `translateX(-50%) translateY(-50%)` }}
      />
    </div>
  )
}

interface TransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

function TransactionModal({ transaction, onClose }: TransactionModalProps) {
  const getRiskLabel = () => {
    if (!transaction.aiAssessment) return null
    const { riskLevel } = transaction.aiAssessment
    return riskLevel === "low" ? "LOW RISK" : riskLevel === "medium" ? "MEDIUM RISK" : "HIGH RISK"
  }

  const getRiskVariant = () => {
    if (!transaction.aiAssessment) return "safe"
    const { riskLevel } = transaction.aiAssessment
    return riskLevel === "low" ? "safe" : riskLevel === "medium" ? "warning" : "risk"
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-[520px] max-h-[80vh] overflow-y-auto bg-vanta-surface border border-border rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-vanta-text-muted hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        {/* Status badge */}
        <div className="flex justify-center mb-4">
          <StatusBadge variant={transaction.tier} className="text-xs px-3 py-1.5">
            {transaction.tier === "auto" ? "AUTO-APPROVED" : transaction.tier === "confirmed" ? "CONFIRMED" : "BLOCKED"}
          </StatusBadge>
        </div>

        {/* Transaction type */}
        <h2 className="font-mono text-lg text-foreground text-center mb-1">
          {transaction.description.split(" ")[0]}
        </h2>
        <p className="text-xs text-vanta-text-muted text-center mb-6">
          April 3, 2026 at 14:23 UTC
        </p>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6">
          <div>
            <span className="text-vanta-text-muted">From</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-foreground">{transaction.from}</span>
              <button className="text-vanta-text-muted hover:text-foreground">
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div>
            <span className="text-vanta-text-muted">To</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-foreground">{transaction.to}</span>
              {transaction.contractVerified && (
                <Shield size={12} className="text-vanta-teal" />
              )}
            </div>
          </div>
          <div>
            <span className="text-vanta-text-muted">Amount</span>
            <span className="font-mono text-foreground block mt-1">{transaction.amount}</span>
          </div>
          <div>
            <span className="text-vanta-text-muted">Gas</span>
            <span className="font-mono text-foreground block mt-1">{transaction.gas}</span>
          </div>
          <div>
            <span className="text-vanta-text-muted">Network</span>
            <span className="text-foreground block mt-1">{transaction.network}</span>
          </div>
          <div>
            <span className="text-vanta-text-muted">Agent</span>
            <span className="text-foreground block mt-1">{transaction.agent}</span>
          </div>
        </div>

        {/* AI Assessment */}
        {transaction.aiAssessment && (
          <>
            <div className="h-px bg-border mb-6" />
            <div className="mb-6">
              <h3 className="text-[13px] text-vanta-text-secondary mb-4">AI scanner assessment</h3>
              <div className="mb-3">
                <RiskMeter score={transaction.aiAssessment.riskScore} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <StatusBadge variant={getRiskVariant() as "safe" | "warning" | "risk"}>
                  {getRiskLabel()}
                </StatusBadge>
                <span className="font-mono text-xs text-vanta-text-muted">
                  {transaction.aiAssessment.riskScore}/100
                </span>
              </div>
              <ul className="space-y-2">
                {transaction.aiAssessment.checks.map((check, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-vanta-text-secondary">
                    {check.passed ? (
                      <Check size={14} className="text-vanta-teal mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-vanta-red mt-0.5 shrink-0" />
                    )}
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Action buttons (only for pending tier 2) */}
        {transaction.tier === "confirmed" && (
          <>
            <div className="h-px bg-border mb-6" />
            <div className="space-y-3">
              <Button
                className="w-full h-10 bg-transparent border border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg transition-colors"
              >
                <Fingerprint size={18} className="mr-2" />
                Approve with Face ID
              </Button>
              <button className="w-full text-center text-[13px] text-vanta-red hover:underline">
                Reject
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function TransactionRow({ 
  transaction, 
  onSelect 
}: { 
  transaction: Transaction
  onSelect: (tx: Transaction) => void 
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <motion.div
        className={cn(
          "flex items-center gap-4 px-4 py-3 transition-colors duration-150 cursor-pointer",
          "hover:bg-vanta-elevated"
        )}
        whileTap={{ scale: 0.995 }}
      >
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-4 flex-1 text-left">
          <StatusIcon status={transaction.status} />
          <span className="flex-1 text-[13px] text-foreground truncate">
            {transaction.description}
          </span>
          <span className="hidden sm:block text-xs text-vanta-text-muted w-24">
            {transaction.agent}
          </span>
          <span className="font-mono text-[13px] text-foreground w-24 text-right">
            {transaction.amount}
          </span>
          <span className="hidden md:block text-xs text-vanta-text-muted w-20 text-right">
            {transaction.time}
          </span>
          <StatusBadge variant={transaction.tier} className="w-24 justify-center">
            {transaction.tier.toUpperCase()}
          </StatusBadge>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-vanta-text-muted" />
          </motion.div>
        </button>
        <button
          onClick={() => onSelect(transaction)}
          className="text-xs text-vanta-text-muted hover:text-vanta-teal transition-colors"
        >
          Details
        </button>
      </motion.div>

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
              {transaction.aiAssessment && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-vanta-text-secondary">AI Assessment:</span>
                    <StatusBadge variant={transaction.aiAssessment.riskLevel === "low" ? "safe" : transaction.aiAssessment.riskLevel === "medium" ? "warning" : "risk"}>
                      {transaction.aiAssessment.riskLevel.toUpperCase()} RISK
                    </StatusBadge>
                  </div>
                  <ul className="space-y-1.5">
                    {transaction.aiAssessment.checks.slice(0, 3).map((check, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-vanta-text-secondary">
                        {check.passed ? (
                          <Check size={14} className="text-vanta-teal mt-0.5 shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-vanta-red mt-0.5 shrink-0" />
                        )}
                        <span>{check.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  return (
    <DashboardLayout title="Transactions">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="hidden md:flex items-center gap-4 px-4 py-3 border-b border-border text-xs text-vanta-text-muted">
          <span className="w-4" />
          <span className="flex-1">Description</span>
          <span className="w-24">Agent</span>
          <span className="w-24 text-right">Amount</span>
          <span className="w-20 text-right">Time</span>
          <span className="w-24 text-center">Tier</span>
          <span className="w-4" />
          <span className="w-12" />
        </div>

        {/* Transactions */}
        {mockTransactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            onSelect={setSelectedTransaction}
          />
        ))}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <TransactionModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
