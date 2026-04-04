"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertTriangle, XCircle, ChevronDown, ExternalLink, Copy } from "lucide-react"
import { StatusBadge } from "../status-badge"
import { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io"

function shortenAddr(addr?: string) {
  if (!addr) return "—"
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface RecentActivityCardProps {
  transactions: Transaction[]
}

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

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const explorer = transaction.network === "Sepolia" ? SEPOLIA_EXPLORER : "https://etherscan.io"

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
        <StatusIcon status={transaction.status} />
        <span className="flex-1 text-[13px] text-foreground truncate">
          {transaction.description}
        </span>
        <span className="hidden sm:block text-xs text-vanta-text-muted w-24">
          {transaction.agent}
        </span>
        <span className="font-mono text-[13px] text-foreground w-20 text-right">
          {transaction.amount}
        </span>
        <span className="hidden md:block text-xs text-vanta-text-muted w-20 text-right">
          {transaction.time}
        </span>
        <StatusBadge
          variant={transaction.tier}
          className="w-20 justify-center"
        >
          {transaction.tier.toUpperCase()}
        </StatusBadge>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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
              {/* AI Assessment */}
              {transaction.aiAssessment && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-vanta-text-secondary">AI Assessment:</span>
                    <StatusBadge variant={transaction.aiAssessment.riskLevel === "low" ? "safe" : transaction.aiAssessment.riskLevel === "medium" ? "warning" : "risk"}>
                      {transaction.aiAssessment.riskLevel.toUpperCase()} RISK
                    </StatusBadge>
                    <span className="font-mono text-xs text-vanta-text-muted">
                      Score: {transaction.aiAssessment.riskScore}/100
                    </span>
                  </div>
                  <ul className="space-y-1.5">
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
              )}

              {/* Transaction Details */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-vanta-text-muted block mb-1">From</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-foreground">{shortenAddr(transaction.from)}</span>
                    {transaction.from && (
                      <a
                        href={`${explorer}/address/${transaction.from}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vanta-text-muted hover:text-vanta-teal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-vanta-text-muted block mb-1">To</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-foreground">{shortenAddr(transaction.to)}</span>
                    {transaction.contractVerified && (
                      <Check size={12} className="text-vanta-teal" />
                    )}
                    {transaction.to && (
                      <a
                        href={`${explorer}/address/${transaction.to}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vanta-text-muted hover:text-vanta-teal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-vanta-text-muted block mb-1">Network</span>
                  <span className="text-foreground">{transaction.network}</span>
                </div>
                <div>
                  <span className="text-vanta-text-muted block mb-1">TX ID</span>
                  <span className="font-mono text-foreground text-[10px]">{shortenAddr(transaction.id)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function RecentActivityCard({ transactions }: RecentActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-[13px] text-vanta-text-secondary">Recent activity</h3>
        <Link
          href="/transactions"
          className="text-xs text-vanta-text-muted hover:text-vanta-text-secondary hover:underline transition-colors"
        >
          View all →
        </Link>
      </div>
      <div>
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs text-vanta-text-muted">
            No transactions yet. Submit one via the MCP endpoint to get started.
          </div>
        ) : (
          transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
      </div>
    </motion.div>
  )
}
