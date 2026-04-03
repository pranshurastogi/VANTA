"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Fingerprint, ArrowDown, ChevronDown, Check } from "lucide-react"
import { VantaLogo } from "./logo"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onReject: () => void
  transaction?: {
    type: string
    amount: string
    amountUsd: string
    to: string
    isNewAddress: boolean
    riskLevel: "low" | "medium" | "high"
    riskReasons: string[]
    gas: string
    network: string
    agent: string
    aiChecks: { passed: number; warnings: number }
    warningDetail?: string
  }
}

function RiskMeter({ level }: { level: "low" | "medium" | "high" }) {
  const getColor = () => {
    switch (level) {
      case "low": return "bg-vanta-teal"
      case "medium": return "bg-vanta-amber"
      case "high": return "bg-vanta-red"
    }
  }

  const getWidth = () => {
    switch (level) {
      case "low": return "25%"
      case "medium": return "50%"
      case "high": return "85%"
    }
  }

  const getLabel = () => {
    switch (level) {
      case "low": return "LOW RISK"
      case "medium": return "MEDIUM RISK"
      case "high": return "HIGH RISK"
    }
  }

  return (
    <div className="space-y-2">
      <div className="h-1.5 bg-vanta-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: getWidth() }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>
      <div className="flex items-center justify-center">
        <StatusBadge variant={level === "low" ? "safe" : level === "medium" ? "warning" : "risk"}>
          {getLabel()}
        </StatusBadge>
      </div>
    </div>
  )
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onReject,
  transaction = {
    type: "Send",
    amount: "1.2 ETH",
    amountUsd: "$2,847.60",
    to: "0x8f2a...3b1c",
    isNewAddress: true,
    riskLevel: "medium",
    riskReasons: ["New address", "Above $1,000 threshold"],
    gas: "$3.20",
    network: "Ethereum Mainnet",
    agent: "DeFi manager",
    aiChecks: { passed: 5, warnings: 1 },
    warningDetail: "This address has not been previously used"
  }
}: ConfirmationModalProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleConfirm = () => {
    setIsConfirmed(true)
    setTimeout(() => {
      onConfirm()
      setIsConfirmed(false)
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[400px] bg-vanta-surface border border-border rounded-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              {!isConfirmed ? (
                <motion.div
                  key="request"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    <VantaLogo size={32} />
                  </div>

                  {/* Title */}
                  <h2 className="font-mono text-base text-foreground text-center mb-1">
                    Transaction request
                  </h2>

                  <div className="h-px bg-border my-4" />

                  {/* Transaction Summary */}
                  <div className="text-center space-y-2 mb-4">
                    <span className="text-[13px] text-vanta-text-secondary">{transaction.type}</span>
                    <div className="font-mono text-3xl text-foreground">{transaction.amount}</div>
                    <div className="text-sm text-vanta-text-muted">{transaction.amountUsd}</div>
                    <div className="flex items-center justify-center gap-2 text-vanta-text-muted">
                      <ArrowDown size={16} />
                    </div>
                    <div className="font-mono text-sm text-foreground">to {transaction.to}</div>
                    {transaction.isNewAddress && (
                      <StatusBadge variant="warning">New address</StatusBadge>
                    )}
                  </div>

                  {/* Risk Assessment */}
                  <div className="mb-4">
                    <RiskMeter level={transaction.riskLevel} />
                    <p className="text-xs text-vanta-text-muted text-center mt-2">
                      {transaction.riskReasons.join(" · ")}
                    </p>
                  </div>

                  <div className="h-px bg-border my-4" />

                  {/* Details Accordion */}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-vanta-text-muted hover:text-foreground transition-colors mb-4"
                  >
                    Show details
                    <motion.div
                      animate={{ rotate: showDetails ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={14} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="space-y-2 text-xs pb-4 border-b border-border">
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">Gas</span>
                            <span className="font-mono text-foreground">{transaction.gas}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">Network</span>
                            <span className="text-foreground">{transaction.network}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">Agent</span>
                            <span className="text-foreground">{transaction.agent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">AI checks</span>
                            <span className="text-foreground">
                              {transaction.aiChecks.passed} passed, {transaction.aiChecks.warnings} warning
                            </span>
                          </div>
                          {transaction.warningDetail && (
                            <div className="mt-2 p-2 bg-vanta-amber/10 rounded text-vanta-amber">
                              Warning: {transaction.warningDetail}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Biometric Button with shimmer */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="relative w-full h-14 rounded-xl border border-vanta-teal text-vanta-teal flex items-center justify-center gap-3 overflow-hidden group hover:bg-vanta-teal hover:text-vanta-bg transition-colors"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 shimmer-border opacity-50 group-hover:opacity-0" />
                      <Fingerprint size={20} />
                      <span className="text-sm font-medium">Confirm with Face ID</span>
                    </motion.button>

                    <button
                      onClick={onReject}
                      className="w-full text-center text-[13px] text-vanta-red hover:underline"
                    >
                      Reject
                    </button>

                    <button className="w-full text-center text-xs text-vanta-text-muted hover:text-foreground transition-colors">
                      Add to whitelist & approve
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.1, 1] }}
                    transition={{ duration: 0.4, times: [0, 0.7, 1] }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-vanta-teal/20 flex items-center justify-center"
                  >
                    <Check size={32} className="text-vanta-teal" />
                  </motion.div>
                  <h3 className="font-mono text-lg text-vanta-teal mb-2">Confirmed</h3>
                  <p className="text-xs text-vanta-text-secondary flex items-center justify-center gap-2">
                    Transaction broadcasting
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ...
                    </motion.span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
