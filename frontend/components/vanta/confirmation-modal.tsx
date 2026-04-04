"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Fingerprint,
  ArrowDown,
  ChevronDown,
  Check,
  Globe,
  Usb,
  Type,
  Loader2,
  ExternalLink,
  Copy,
  Shield,
  Clock,
} from "lucide-react"
import { VantaLogo } from "./logo"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { usePasskey } from "@/hooks/usePasskey"
import { WorldIdGate } from "./world-id-gate"
import { useWorldId } from "@/hooks/useWorldId"

type ConfirmationMethod = "passkey" | "worldid" | "ledger" | "manual"

const CONFIRM_LABELS: Record<ConfirmationMethod, { icon: typeof Fingerprint; label: string }> = {
  passkey: { icon: Fingerprint, label: "Confirm with Face ID" },
  worldid: { icon: Globe, label: "Confirm with World ID" },
  ledger: { icon: Usb, label: "Confirm with Ledger" },
  manual: { icon: Type, label: "Type CONFIRM to approve" },
}

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io"

function shortenAddress(addr?: string) {
  if (!addr) return "—"
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onReject: () => void
  confirmationMethod?: ConfirmationMethod
  walletAddress?: string
  worldIdRequired?: boolean
  transaction?: {
    id?: string
    type: string
    amount: string
    amountUsd: string
    to: string
    toFull?: string
    fromFull?: string
    isNewAddress: boolean
    riskLevel: "low" | "medium" | "high"
    riskReasons: string[]
    gas: string
    network: string
    agent: string
    tier?: number
    chainId?: number
    txHash?: string | null
    aiChecks: { passed: number; warnings: number }
    warningDetail?: string
    value?: string
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

function AddressDisplay({ label, address, chainId }: { label: string; address?: string; chainId?: number }) {
  if (!address) return null
  const explorer = chainId === 11155111 ? SEPOLIA_EXPLORER : "https://etherscan.io"
  return (
    <div className="flex items-center gap-2">
      <span className="text-vanta-text-muted text-xs w-10 shrink-0">{label}</span>
      <span className="font-mono text-xs text-foreground">{shortenAddress(address)}</span>
      <button onClick={() => copyToClipboard(address)} className="text-vanta-text-muted hover:text-foreground transition-colors">
        <Copy size={11} />
      </button>
      <a href={`${explorer}/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-vanta-text-muted hover:text-vanta-teal transition-colors">
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onReject,
  confirmationMethod = "passkey",
  walletAddress,
  worldIdRequired = false,
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
    tier: 2,
    aiChecks: { passed: 5, warnings: 1 },
    warningDetail: "This address has not been previously used"
  }
}: ConfirmationModalProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [stage, setStage] = useState<"request" | "confirming" | "confirmed">("request")
  const [manualInput, setManualInput] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [worldIdOverrideComplete, setWorldIdOverrideComplete] = useState(false)
  const [confirmedTxId, setConfirmedTxId] = useState<string | null>(null)
  const { verify: verifyPasskey, registered: passkeyRegistered } = usePasskey()
  const { verified: worldIdVerified } = useWorldId(walletAddress)

  const confirmInfo = CONFIRM_LABELS[confirmationMethod]
  const ConfirmIcon = confirmInfo.icon
  const needsWorldIdFirst = worldIdRequired && !worldIdVerified && !worldIdOverrideComplete
  const explorer = (transaction.chainId === 11155111) ? SEPOLIA_EXPLORER : "https://etherscan.io"

  const handleConfirm = async () => {
    if (confirmationMethod === "manual" && manualInput !== "CONFIRM") return
    setVerifyError("")

    if (confirmationMethod === "worldid") {
      if (!worldIdVerified) {
        setVerifyError("World ID verification required. Click 'Verify with World ID' above.")
        return
      }
    }

    if (confirmationMethod === "passkey") {
      if (!passkeyRegistered) {
        setVerifyError("No passkey registered. Go to Settings to set one up. Approving without verification.")
      } else {
        setVerifying(true)
        const ok = await verifyPasskey()
        setVerifying(false)
        if (!ok) {
          setVerifyError("Passkey verification failed. Try again.")
          return
        }
      }
    }

    setStage("confirming")
    setConfirmedTxId(transaction.id ?? null)

    // Small delay to show confirming state, then call onConfirm
    setTimeout(() => {
      onConfirm()
      setStage("confirmed")
      setManualInput("")
    }, 800)
  }

  const handleDismiss = () => {
    setStage("request")
    setWorldIdOverrideComplete(false)
    setConfirmedTxId(null)
    onClose()
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
        >
          {/* Backdrop — does NOT close on click */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[440px] bg-vanta-surface border border-border rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              {stage === "request" && (
                <motion.div
                  key="request"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    <VantaLogo size={32} />
                  </div>

                  {/* Title */}
                  <h2 className="font-mono text-base text-foreground text-center mb-1">
                    Transaction request
                  </h2>

                  {/* TX ID */}
                  {transaction.id && (
                    <p className="text-center text-[10px] text-vanta-text-muted font-mono mt-1">
                      TX: {transaction.id.slice(0, 8)}...{transaction.id.slice(-6)}
                    </p>
                  )}

                  <div className="h-px bg-border my-4" />

                  {/* Transaction Summary */}
                  <div className="text-center space-y-2 mb-4">
                    <span className="text-[13px] text-vanta-text-secondary">{transaction.type}</span>
                    <div className="font-mono text-3xl text-foreground">{transaction.amount}</div>
                    <div className="text-sm text-vanta-text-muted">{transaction.amountUsd}</div>

                    {/* From / To with explorer links */}
                    <div className="pt-2 space-y-1.5">
                      <AddressDisplay label="From" address={transaction.fromFull} chainId={transaction.chainId} />
                      <div className="flex items-center justify-center">
                        <ArrowDown size={14} className="text-vanta-text-muted" />
                      </div>
                      <AddressDisplay label="To" address={transaction.toFull} chainId={transaction.chainId} />
                    </div>

                    {transaction.isNewAddress && (
                      <div className="pt-1">
                        <StatusBadge variant="warning">New address</StatusBadge>
                      </div>
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
                          {transaction.value && (
                            <div className="flex justify-between">
                              <span className="text-vanta-text-muted">Raw value</span>
                              <span className="font-mono text-foreground">{transaction.value} wei</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">Gas estimate</span>
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

                  {/* Tier badge + verification method */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {transaction.tier && (
                      <StatusBadge variant={transaction.tier === 2 ? "warning" : "risk"}>
                        Tier {transaction.tier}
                      </StatusBadge>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-vanta-text-muted">
                      <ConfirmIcon size={12} />
                      <span>{confirmationMethod === "worldid" ? "World ID" : confirmationMethod === "passkey" ? "Passkey" : confirmationMethod === "ledger" ? "Ledger" : "Manual"}</span>
                    </div>
                  </div>

                  {/* World ID Gate — shown for Tier 3 override or worldid confirmation method */}
                  {(needsWorldIdFirst || confirmationMethod === "worldid") && !worldIdVerified && (
                    <div className="mb-4 p-3 bg-vanta-elevated/50 border border-border rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs text-vanta-amber mb-1">
                        <Globe size={14} />
                        <span className="font-medium">
                          {needsWorldIdFirst
                            ? "Proof of Human required to override blocked transaction"
                            : "Verify with World ID to confirm"
                          }
                        </span>
                      </div>
                      <WorldIdGate
                        address={walletAddress}
                        compact
                        onVerified={() => setWorldIdOverrideComplete(true)}
                      />
                    </div>
                  )}

                  {/* World ID verified badge */}
                  {(confirmationMethod === "worldid" || worldIdOverrideComplete) && worldIdVerified && (
                    <div className="mb-4 p-2.5 bg-vanta-teal/10 border border-vanta-teal/20 rounded-xl flex items-center gap-2 text-xs text-vanta-teal">
                      <Check size={14} />
                      Human verified — you can now approve this transaction
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Manual confirmation input */}
                    {confirmationMethod === "manual" && (
                      <input
                        type="text"
                        placeholder='Type "CONFIRM" to approve'
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-vanta-elevated border border-border-hover rounded-xl text-foreground font-mono text-center text-sm placeholder:text-vanta-text-muted"
                        autoFocus
                      />
                    )}

                    {/* Verify error */}
                    {verifyError && (
                      <div className="p-2.5 bg-vanta-amber/10 rounded-lg text-[11px] text-vanta-amber text-center">
                        {verifyError}
                      </div>
                    )}

                    {/* Confirm Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      disabled={
                        verifying ||
                        (confirmationMethod === "manual" && manualInput !== "CONFIRM") ||
                        (needsWorldIdFirst && !worldIdOverrideComplete) ||
                        (confirmationMethod === "worldid" && !worldIdVerified)
                      }
                      className={cn(
                        "relative w-full h-14 rounded-xl border border-vanta-teal text-vanta-teal flex items-center justify-center gap-3 overflow-hidden group hover:bg-vanta-teal hover:text-vanta-bg transition-colors",
                        (verifying || (confirmationMethod === "manual" && manualInput !== "CONFIRM") || (needsWorldIdFirst && !worldIdOverrideComplete) || (confirmationMethod === "worldid" && !worldIdVerified)) && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-vanta-teal"
                      )}
                    >
                      <div className="absolute inset-0 shimmer-border opacity-50 group-hover:opacity-0" />
                      {verifying ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span className="text-sm font-medium">Verifying…</span>
                        </>
                      ) : (
                        <>
                          <ConfirmIcon size={20} />
                          <span className="text-sm font-medium">{confirmInfo.label}</span>
                        </>
                      )}
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
              )}

              {stage === "confirming" && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 py-12 text-center"
                >
                  <Loader2 size={40} className="mx-auto mb-4 text-vanta-teal animate-spin" />
                  <h3 className="font-mono text-lg text-foreground mb-2">Processing</h3>
                  <p className="text-xs text-vanta-text-muted">Confirming transaction…</p>
                </motion.div>
              )}

              {stage === "confirmed" && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.1, 1] }}
                    transition={{ duration: 0.4, times: [0, 0.7, 1] }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-vanta-teal/20 flex items-center justify-center"
                  >
                    <Check size={32} className="text-vanta-teal" />
                  </motion.div>
                  <h3 className="font-mono text-lg text-vanta-teal mb-2 text-center">Confirmed</h3>

                  {/* Confirmation receipt */}
                  <div className="mt-4 space-y-3 p-4 bg-vanta-elevated/50 border border-border rounded-xl">
                    <div className="space-y-2 text-xs">
                      {confirmedTxId && (
                        <div className="flex justify-between items-center">
                          <span className="text-vanta-text-muted">TX ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-foreground">{confirmedTxId.slice(0, 8)}...{confirmedTxId.slice(-6)}</span>
                            <button onClick={() => copyToClipboard(confirmedTxId)} className="text-vanta-text-muted hover:text-foreground">
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-vanta-text-muted">Amount</span>
                        <span className="font-mono text-foreground">{transaction.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-vanta-text-muted">Value</span>
                        <span className="font-mono text-foreground">{transaction.amountUsd}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-vanta-text-muted">To</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-foreground">{shortenAddress(transaction.toFull || transaction.to)}</span>
                          {transaction.toFull && (
                            <a href={`${explorer}/address/${transaction.toFull}`} target="_blank" rel="noopener noreferrer" className="text-vanta-text-muted hover:text-vanta-teal">
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-vanta-text-muted">Network</span>
                        <span className="text-foreground">{transaction.network}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-vanta-text-muted">Verified by</span>
                        <div className="flex items-center gap-1.5 text-vanta-teal">
                          <ConfirmIcon size={12} />
                          <span>{confirmationMethod === "worldid" ? "World ID" : confirmationMethod === "passkey" ? "Passkey" : confirmationMethod === "ledger" ? "Ledger" : "Manual"}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-vanta-text-muted">Time</span>
                        <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Verification proof indicator */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Shield size={12} className="text-vanta-teal" />
                        <span className="text-vanta-teal font-medium">Verification proof recorded</span>
                      </div>
                      <p className="text-[10px] text-vanta-text-muted mt-1 pl-5">
                        {confirmationMethod === "worldid"
                          ? "Zero-knowledge proof of unique human verified on-chain"
                          : confirmationMethod === "passkey"
                            ? "WebAuthn assertion verified — biometric signature recorded"
                            : confirmationMethod === "ledger"
                              ? "Hardware wallet signature verified"
                              : "Manual confirmation recorded"
                        }
                      </p>
                    </div>

                    {/* TX hash link (if available) */}
                    {transaction.txHash && (
                      <a
                        href={`${explorer}/tx/${transaction.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-vanta-teal/10 border border-vanta-teal/20 rounded-lg text-xs text-vanta-teal hover:bg-vanta-teal/20 transition-colors"
                      >
                        <ExternalLink size={12} />
                        View on Explorer
                      </a>
                    )}
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full mt-4 py-3 text-sm text-vanta-text-secondary hover:text-foreground transition-colors text-center"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
