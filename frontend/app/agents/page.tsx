"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  Plus,
  MoreVertical,
  Play,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Clock,
  Copy,
  Terminal,
  Zap,
  Skull,
  ArrowRightLeft,
  Coins,
  Bug,
  ExternalLink,
  Check,
  XCircle,
  ChevronDown,
  RefreshCw,
} from "lucide-react"
import { InfinityLoader } from "@/components/ui/loader-13"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/useUser"
import { useRules, type DbRule } from "@/hooks/useRules"
import { useDynamic } from "@/lib/dynamic/context"

// ─── Types ─────────────────────────────────────────────────────────────────

interface SimulationResult {
  txId: string
  tier: number
  status: string
  policyResult: { tier: number; reason: string; matchedRules: string[] }
  scanResult: { riskScore: number; recommendation: string; reasoning: string; checks?: { name: string; passed: boolean; detail: string }[]; model?: string }
  worldIdRequired?: boolean
  worldIdVerified?: boolean
}

interface SimulationStep {
  id: string
  label: string
  status: "pending" | "running" | "done" | "error"
  detail?: string
}

// ─── Real calldata encoders ────────────────────────────────────────────────

// ERC-20 transfer(address,uint256) — 0xa9059cbb
const ERC20_TRANSFER = (to: string, amount: string) =>
  `0xa9059cbb${to.replace("0x", "").padStart(64, "0")}${BigInt(amount).toString(16).padStart(64, "0")}`

// ERC-20 approve(address,uint256) — 0x095ea7b3
const ERC20_APPROVE = (spender: string, amount: string) =>
  `0x095ea7b3${spender.replace("0x", "").padStart(64, "0")}${BigInt(amount).toString(16).padStart(64, "0")}`

// Max uint256 as raw hex (not through BigInt to avoid SSR errors)
const MAX_UINT256_HEX = "f".repeat(64)

// approve with unlimited amount — uses raw hex, not BigInt
const ERC20_APPROVE_UNLIMITED = (spender: string) =>
  `0x095ea7b3${spender.replace("0x", "").padStart(64, "0")}${MAX_UINT256_HEX}`

// Uniswap V3 exactInputSingle — 0x414bf389
const UNISWAP_SWAP = (recipient: string) =>
  `0x414bf389` +
  `${"c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".padStart(64, "0")}` +
  `${"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".padStart(64, "0")}` +
  `${"0bb8".padStart(64, "0")}` +
  `${recipient.replace("0x", "").padStart(64, "0")}` +
  `${(Math.floor(Date.now() / 1000) + 1200).toString(16).padStart(64, "0")}` +
  `${BigInt("500000000000000000").toString(16).padStart(64, "0")}` +
  `${"0".padStart(64, "0")}` +
  `${"0".padStart(64, "0")}`

// Aave V3 supply(address,uint256,address,uint16) — 0x617ba037
const AAVE_SUPPLY = (asset: string, amount: string, onBehalfOf: string) =>
  `0x617ba037` +
  `${asset.replace("0x", "").padStart(64, "0")}` +
  `${BigInt(amount).toString(16).padStart(64, "0")}` +
  `${onBehalfOf.replace("0x", "").padStart(64, "0")}` +
  `${"0".padStart(64, "0")}`

// transferOwnership(address) — 0xf2fde38b
const TRANSFER_OWNERSHIP = (newOwner: string) =>
  `0xf2fde38b${newOwner.replace("0x", "").padStart(64, "0")}`

// renounceOwnership() — 0x715018a6
const RENOUNCE_OWNERSHIP = () => `0x715018a6`

// setApprovalForAll(address,bool) — 0xa22cb465 (NFT drainer pattern)
const SET_APPROVAL_FOR_ALL = (operator: string) =>
  `0xa22cb465${operator.replace("0x", "").padStart(64, "0")}${"1".padStart(64, "0")}`

// multicall(bytes[]) — 0xac9650d8 (bundled operations)
const MULTICALL_HEADER = () => `0xac9650d8`

// ─── Sepolia addresses ─────────────────────────────────────────────────────

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
const UNISWAP_ROUTER = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" // Sepolia V3 router
const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" // Sepolia Aave V3
const KNOWN_SAFE = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
const UNKNOWN_ADDR = "0xdEaD000000000000000000000000000000000000"
const KNOWN_SCAM = "0x0000000000000000000000000000000000000bad"
const NFT_CONTRACT = "0x1234567890123456789012345678901234567890"
const PHISHING_DRAINER = "0xbaDc0dE0000000000000000000000000baDc0dE0"

// ─── Preset categories & templates ─────────────────────────────────────────

type Category = "safe" | "defi" | "suspicious" | "attack"

const CATEGORY_META: Record<Category, { label: string; color: string; icon: typeof Shield; description: string }> = {
  safe: {
    label: "Safe",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: ShieldCheck,
    description: "Low-risk transfers and operations → expect Tier 1",
  },
  defi: {
    label: "DeFi",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: ArrowRightLeft,
    description: "Protocol interactions → expect Tier 1–2",
  },
  suspicious: {
    label: "Suspicious",
    color: "bg-vanta-amber/10 text-vanta-amber border-vanta-amber/20",
    icon: AlertTriangle,
    description: "Unusual patterns → expect Tier 2 confirmation",
  },
  attack: {
    label: "Attack",
    color: "bg-vanta-red/10 text-vanta-red border-vanta-red/20",
    icon: Skull,
    description: "Malicious patterns → expect Tier 3 block",
  },
}

interface Preset {
  label: string
  to: string
  eth: string
  data?: string
  dataFn?: boolean
  description: string
  category: Category
  expectedTier: 1 | 2 | 3
  attackType?: string
  agentName: string
}

const presets: Preset[] = [
  // ─── Safe (Tier 1) ─────────────────────────────────────────
  {
    label: "Small ETH transfer",
    to: KNOWN_SAFE,
    eth: "0.005",
    description: "Tiny transfer to known address — well within limits",
    category: "safe",
    expectedTier: 1,
    agentName: "payment-bot",
  },
  {
    label: "Micro payment",
    to: KNOWN_SAFE,
    eth: "0.001",
    description: "Dust-level payment — auto-approved instantly",
    category: "safe",
    expectedTier: 1,
    agentName: "tip-jar-agent",
  },
  {
    label: "Bounded token approval",
    to: SEPOLIA_USDC,
    eth: "0",
    data: ERC20_APPROVE(UNISWAP_ROUTER, "5000000000"),
    description: "Approve exactly 5,000 USDC for Uniswap — bounded, safe",
    category: "safe",
    expectedTier: 1,
    agentName: "defi-manager",
  },

  // ─── DeFi (Tier 1–2) ──────────────────────────────────────
  {
    label: "Uniswap V3 swap",
    to: UNISWAP_ROUTER,
    eth: "0.5",
    dataFn: true,
    description: "Swap 0.5 ETH → USDC on Uniswap V3 (Sepolia)",
    category: "defi",
    expectedTier: 2,
    agentName: "trading-bot",
  },
  {
    label: "Aave V3 supply",
    to: AAVE_POOL,
    eth: "0",
    dataFn: true,
    description: "Supply 500 USDC to Aave V3 lending pool",
    category: "defi",
    expectedTier: 1,
    agentName: "yield-optimizer",
  },
  {
    label: "ERC-20 transfer",
    to: SEPOLIA_USDC,
    eth: "0",
    data: ERC20_TRANSFER(KNOWN_SAFE, "1000000000"),
    description: "Transfer 1,000 USDC to known address",
    category: "defi",
    expectedTier: 1,
    agentName: "treasury-agent",
  },
  {
    label: "Large ETH transfer",
    to: KNOWN_SAFE,
    eth: "2.5",
    description: "2.5 ETH ($6,000) — exceeds per-tx limit → needs confirmation",
    category: "defi",
    expectedTier: 2,
    agentName: "portfolio-rebalancer",
  },

  // ─── Suspicious (Tier 2) ───────────────────────────────────
  {
    label: "Transfer to new address",
    to: UNKNOWN_ADDR,
    eth: "0.8",
    description: "0.8 ETH to never-seen address — not whitelisted",
    category: "suspicious",
    expectedTier: 2,
    agentName: "unknown-agent",
  },
  {
    label: "Late-night large transfer",
    to: KNOWN_SAFE,
    eth: "5.0",
    description: "5 ETH during quiet hours — triggers time + value rules",
    category: "suspicious",
    expectedTier: 2,
    agentName: "midnight-bot",
  },
  {
    label: "Contract call to unknown",
    to: "0xCafe00000000000000000000000000000000Cafe",
    eth: "0.1",
    data: `0x12345678${"0".repeat(64)}`,
    description: "Unknown function on unverified contract",
    category: "suspicious",
    expectedTier: 2,
    agentName: "research-agent",
  },

  // ─── Attack simulations (Tier 3) ──────────────────────────
  {
    label: "Unlimited token approval",
    to: SEPOLIA_USDC,
    eth: "0",
    data: ERC20_APPROVE_UNLIMITED(PHISHING_DRAINER),
    description: "Approve MAX_UINT256 to drainer — classic approval phishing",
    category: "attack",
    expectedTier: 3,
    attackType: "Approval Phishing",
    agentName: "compromised-agent",
  },
  {
    label: "Ownership hijack",
    to: NFT_CONTRACT,
    eth: "0",
    data: TRANSFER_OWNERSHIP(PHISHING_DRAINER),
    description: "transferOwnership() to attacker — contract takeover",
    category: "attack",
    expectedTier: 3,
    attackType: "Ownership Hijack",
    agentName: "rogue-deployer",
  },
  {
    label: "NFT setApprovalForAll",
    to: NFT_CONTRACT,
    eth: "0",
    data: SET_APPROVAL_FOR_ALL(PHISHING_DRAINER),
    description: "Grant full NFT collection access to drainer address",
    category: "attack",
    expectedTier: 3,
    attackType: "NFT Drainer",
    agentName: "phishing-bot",
  },
  {
    label: "Renounce ownership",
    to: NFT_CONTRACT,
    eth: "0",
    data: RENOUNCE_OWNERSHIP(),
    description: "renounceOwnership() — irreversible admin key burn",
    category: "attack",
    expectedTier: 3,
    attackType: "Admin Key Burn",
    agentName: "rogue-admin",
  },
  {
    label: "Drain to scam address",
    to: KNOWN_SCAM,
    eth: "10.0",
    description: "10 ETH ($24,000) to known scam address — blacklisted",
    category: "attack",
    expectedTier: 3,
    attackType: "Funds Drain",
    agentName: "compromised-wallet",
  },
  {
    label: "Disguised multicall",
    to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    eth: "0",
    data: `${MULTICALL_HEADER()}${ERC20_APPROVE_UNLIMITED(PHISHING_DRAINER).slice(2)}`,
    description: "Bundled call hiding unlimited approval inside multicall",
    category: "attack",
    expectedTier: 3,
    attackType: "Multicall Exploit",
    agentName: "exploit-bot",
  },
]

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function readAddresses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === "string") return normalizeAddress(entry)
      if (entry && typeof entry === "object" && "address" in entry) {
        return normalizeAddress((entry as { address?: unknown }).address)
      }
      return null
    })
    .filter((v): v is string => !!v)
}

function inferPolicyTierForPreset(
  preset: Preset,
  rules: DbRule[],
  ethPriceUsd = 2400,
): { tier: 1 | 2 | 3; reason: string } {
  const txUsd = Number.parseFloat(preset.eth || "0") * ethPriceUsd
  const calldata = preset.data ?? ""
  const to = preset.to.toLowerCase()

  const active = rules.filter((rule) => rule.enabled)

  for (const rule of active) {
    if (rule.type === "blacklist") {
      const blocked = readAddresses(rule.config?.["addresses"])
      if (blocked.includes(to)) return { tier: 3, reason: "Blacklisted destination" }
    }
    if (rule.type === "block_unlimited_approval") {
      const maxUint = "f".repeat(64)
      if (calldata.toLowerCase().startsWith("0x095ea7b3") && calldata.toLowerCase().includes(maxUint)) {
        return { tier: 3, reason: "Unlimited approval blocked" }
      }
    }
  }

  const tier2Reasons: string[] = []
  for (const rule of active) {
    if (rule.type === "per_tx_limit") {
      const limit = Number(rule.config?.["amount"] ?? 0)
      if (limit > 0 && txUsd > limit) tier2Reasons.push(`Above per-tx limit ($${limit})`)
    }
    if (rule.type === "whitelist") {
      const allowed = readAddresses(rule.config?.["addresses"])
      if (allowed.length > 0 && !allowed.includes(to)) tier2Reasons.push("Destination not whitelisted")
    }
  }

  if (tier2Reasons.length > 0) return { tier: 2, reason: tier2Reasons[0] }
  return { tier: 1, reason: "Within configured policy rules" }
}

// ─── Tier colors ───────────────────────────────────────────────────────────

const TIER_COLORS = {
  1: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "Tier 1 · Auto-Approved",
    icon: ShieldCheck,
  },
  2: {
    bg: "bg-vanta-amber/10",
    border: "border-vanta-amber/30",
    text: "text-vanta-amber",
    dot: "bg-amber-400",
    label: "Tier 2 · Needs Confirmation",
    icon: Clock,
  },
  3: {
    bg: "bg-vanta-red/10",
    border: "border-vanta-red/30",
    text: "text-vanta-red",
    dot: "bg-red-400",
    label: "Tier 3 · Blocked",
    icon: XCircle,
  },
}

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io"

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ─── Simulation Detail Modal ───────────────────────────────────────────────

function SimulationDetailModal({
  result,
  onClose,
}: {
  result: SimulationResult
  onClose: () => void
}) {
  const tierInfo = TIER_COLORS[result.tier as 1 | 2 | 3]
  const TierIcon = tierInfo?.icon ?? ShieldCheck
  const checks = result.scanResult.checks || []
  const passedCount = checks.filter((c) => c.passed).length
  const failedCount = checks.filter((c) => !c.passed).length
  const riskScore = result.scanResult.riskScore

  // SVG gauge
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (riskScore / 100) * circumference
  const scoreColor = riskScore < 30 ? "var(--vanta-teal)" : riskScore < 70 ? "var(--vanta-amber)" : "var(--vanta-red)"
  const scoreText = riskScore < 30 ? "text-vanta-teal" : riskScore < 70 ? "text-vanta-amber" : "text-vanta-red"

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
        <div className={cn("px-6 py-4 flex items-center justify-between border-b border-border", tierInfo?.bg)}>
          <div className="flex items-center gap-3">
            <TierIcon size={20} className={tierInfo?.text} />
            <div>
              <h2 className={cn("text-sm font-medium", tierInfo?.text)}>{tierInfo?.label}</h2>
              <p className="text-[11px] text-vanta-text-muted font-mono">TX #{result.txId.slice(0, 12)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-vanta-elevated/50 transition-colors"
          >
            <XCircle size={18} className="text-vanta-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Score gauge + verdict */}
          <div className="flex items-center justify-between">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--vanta-elevated)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r={radius}
                  fill="none" stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="text-center">
                <motion.span
                  className={cn("font-mono text-2xl font-bold", scoreText)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {riskScore}
                </motion.span>
                <p className="text-[10px] text-vanta-text-muted">/100</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-sm",
                result.scanResult.recommendation === "approve" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                result.scanResult.recommendation === "flag" ? "bg-vanta-amber/10 border-vanta-amber/30 text-vanta-amber" :
                "bg-vanta-red/10 border-vanta-red/30 text-vanta-red"
              )}>
                {result.scanResult.recommendation === "approve" ? <ShieldCheck size={16} /> :
                 result.scanResult.recommendation === "flag" ? <AlertTriangle size={16} /> :
                 <XCircle size={16} />}
                {result.scanResult.recommendation === "approve" ? "Approved" : result.scanResult.recommendation === "flag" ? "Flagged" : "Blocked"}
              </span>
              <div className="text-xs text-vanta-text-muted">
                <span className="text-emerald-400">{passedCount} passed</span>
                {failedCount > 0 && <span className="text-vanta-red"> · {failedCount} failed</span>}
              </div>
              {result.worldIdVerified && (
                <p className="text-[11px] text-vanta-teal">World ID: 2x limit active</p>
              )}
            </div>
          </div>

          {/* Policy Engine */}
          <div className="bg-vanta-elevated/50 rounded-xl px-4 py-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-vanta-teal" />
              <span className="text-[11px] text-vanta-text-muted uppercase tracking-wider">Policy Engine</span>
            </div>
            <p className="text-[13px] text-foreground">{result.policyResult.reason}</p>
            {result.policyResult.matchedRules.length > 0 && (
              <p className="text-[11px] text-vanta-text-muted mt-1">{result.policyResult.matchedRules.length} rule(s) matched</p>
            )}
          </div>

          {/* AI Reasoning */}
          <div className="bg-vanta-elevated/50 rounded-xl px-4 py-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-vanta-teal" />
              <span className="text-[11px] text-vanta-text-muted uppercase tracking-wider">AI Analysis</span>
            </div>
            <p className="text-[13px] text-vanta-text-secondary leading-relaxed">{result.scanResult.reasoning}</p>
          </div>

          {/* Security Checks */}
          {checks.length > 0 && (
            <div>
              <h3 className="text-xs text-vanta-text-muted mb-3 uppercase tracking-wider">Security Checks ({checks.length})</h3>
              <ul className="space-y-2">
                {checks.map((check, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 bg-vanta-elevated/30 rounded-lg px-3 py-2.5"
                  >
                    {check.passed ? (
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-vanta-elevated/30">
          <span className="text-[10px] text-vanta-text-muted font-mono flex items-center gap-1.5">
            <Zap size={10} />
            {result.scanResult.model === "skipped"
              ? "Policy only — AI scan skipped"
              : `Powered by ${result.scanResult.model || "Gemini 3 Flash"}`}
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

// ─── Agent Simulator ───────────────────────────────────────────────────────

function pipelineSteps(skipAi: boolean): SimulationStep[] {
  return [
    { id: "validate", label: "Validating transaction inputs", status: "pending" },
    { id: "policy", label: "Running policy engine", status: "pending" },
    {
      id: "ai",
      label: skipAi ? "AI scan (skipped — policy only)" : "Gemini 3 Flash AI scan",
      status: "pending",
    },
    { id: "persist", label: "Recording to Supabase", status: "pending" },
    { id: "verdict", label: "Computing final verdict", status: "pending" },
  ]
}

function AgentSimulator() {
  const { wallet } = useDynamic()
  const { user } = useUser()
  const { rules } = useRules(user?.id)
  const [to, setTo] = useState("")
  const [eth, setEth] = useState("")
  const [calldata, setCalldata] = useState("")
  const [agentName, setAgentName] = useState("demo-trading-bot")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState("")
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [history, setHistory] = useState<SimulationResult[]>([])
  const [steps, setSteps] = useState<SimulationStep[]>([])
  const [detailModal, setDetailModal] = useState<SimulationResult | null>(null)
  /** When on, submit uses policy engine only — no Gemini / AI scanner on the server */
  const [skipAiScan, setSkipAiScan] = useState(true)

  const address = wallet?.address

  const advanceStep = useCallback((stepId: string, status: SimulationStep["status"], detail?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, status, detail: detail ?? s.detail } : s
      )
    )
  }, [])

  async function simulate() {
    if (!address || !to) return
    setLoading(true)
    setError("")
    setResult(null)
    setSteps(pipelineSteps(skipAiScan).map((s) => ({ ...s, status: "pending" as const })))

    try {
      // Step 1: Validate
      advanceStep("validate", "running")
      await new Promise((r) => setTimeout(r, 300))
      advanceStep("validate", "done", "Inputs validated")

      // Step 2: Policy engine (starts)
      advanceStep("policy", "running")
      await new Promise((r) => setTimeout(r, 200))

      // Step 3: AI scan (starts concurrently)
      advanceStep("ai", "running")

      const valueWei = String(Math.round(parseFloat(eth || "0") * 1e18))
      const res = await fetch("/api/transactions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: address,
          to,
          value: valueWei,
          data: calldata || undefined,
          chainId: 11155111,
          agentId: agentName,
          skipAiScan,
        }),
      })

      if (!res.ok) {
        const e = await res.json()
        advanceStep("policy", "error", e.error ?? "Failed")
        advanceStep("ai", "error")
        throw new Error(e.error ?? "Request failed")
      }

      const data = await res.json()

      // Complete steps with real data
      advanceStep("policy", "done", `Tier ${data.policyResult.tier} — ${data.policyResult.reason}`)
      await new Promise((r) => setTimeout(r, 150))

      const aiChecks = data.scanResult.checks || []
      const passed = aiChecks.filter((c: { passed: boolean }) => c.passed).length
      const failed = aiChecks.filter((c: { passed: boolean }) => !c.passed).length
      const aiDetail =
        data.scanResult.model === "skipped"
          ? "No Gemini call — policy only"
          : `Risk ${data.scanResult.riskScore}/100 — ${passed} passed, ${failed} failed`
      advanceStep("ai", "done", aiDetail)
      await new Promise((r) => setTimeout(r, 150))

      advanceStep("persist", "running")
      await new Promise((r) => setTimeout(r, 200))
      advanceStep("persist", "done", `TX ${data.txId.slice(0, 8)}… saved`)
      await new Promise((r) => setTimeout(r, 100))

      const verdictText = data.status === "approved" ? "Auto-approved" : data.status === "blocked" ? "Blocked" : "Needs confirmation"
      advanceStep("verdict", "running")
      await new Promise((r) => setTimeout(r, 200))
      advanceStep("verdict", "done", verdictText)

      setResult(data)
      setHistory((prev) => [data, ...prev].slice(0, 20))
    } catch (e: unknown) {
      setError((e as Error).message)
      setSteps((prev) => prev.map((s) => s.status === "pending" ? { ...s, status: "error" as const } : s))
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(preset: Preset) {
    setTo(preset.to)
    setEth(preset.eth)
    setAgentName(preset.agentName)
    if (preset.dataFn && address) {
      if (preset.label.includes("Uniswap")) {
        setCalldata(UNISWAP_SWAP(address))
      } else if (preset.label.includes("Aave")) {
        setCalldata(AAVE_SUPPLY(SEPOLIA_USDC, "500000000", address))
      } else {
        setCalldata("")
      }
    } else {
      setCalldata(preset.data ?? "")
    }
    setResult(null)
    setSteps([])
    setError("")
  }

  const filteredPresets = activeCategory === "all" ? presets : presets.filter((p) => p.category === activeCategory)
  const presetPolicyTier = useMemo(
    () =>
      Object.fromEntries(
        presets.map((preset) => [preset.label, inferPolicyTierForPreset(preset, rules)])
      ) as Record<string, { tier: 1 | 2 | 3; reason: string }>,
    [rules]
  )

  const tierInfo = result ? TIER_COLORS[result.tier as 1 | 2 | 3] : null
  const TierIcon = tierInfo?.icon ?? ShieldCheck

  return (
    <>
    <div className="bg-vanta-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-vanta-teal/20 to-blue-500/10 flex items-center justify-center">
            <Terminal size={16} className="text-vanta-teal" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Agent Simulator</h3>
            <p className="text-[11px] text-vanta-text-muted">Simulate real-world attacks & transactions through the VANTA pipeline</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Switch
              checked={skipAiScan}
              onCheckedChange={setSkipAiScan}
              disabled={loading}
              className="data-[state=checked]:bg-vanta-amber shrink-0"
            />
            <span className="text-[11px] text-vanta-text-muted max-w-[140px] sm:max-w-none text-right sm:text-left">
              Rule-first mode (skip AI scan)
            </span>
          </label>
          <div className="flex items-center gap-2 text-[10px] text-vanta-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            Sepolia · 11155111
          </div>
        </div>
      </div>

      <div className="p-0">
        {!address ? (
          <div className="text-center py-12 px-5">
            <Bot size={28} className="mx-auto mb-3 text-vanta-text-muted" />
            <p className="text-sm text-vanta-text-muted">Connect your wallet to simulate transactions</p>
            <p className="text-[11px] text-vanta-text-muted mt-1">All simulations run on Sepolia testnet</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* ── Left: Preset library ── */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors shrink-0",
                    activeCategory === "all"
                      ? "bg-vanta-elevated border-vanta-teal/30 text-vanta-teal"
                      : "border-border text-vanta-text-muted hover:text-foreground"
                  )}
                >
                  All
                </button>
                {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META.safe][]).map(([key, meta]) => {
                  const Icon = meta.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors shrink-0 flex items-center gap-1",
                        activeCategory === key
                          ? `${meta.color} border-current/20`
                          : "border-border text-vanta-text-muted hover:text-foreground"
                      )}
                    >
                      <Icon size={10} />
                      {meta.label}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-1">
                {filteredPresets.map((p) => {
                  const expected = presetPolicyTier[p.label]
                  const previewTier = expected?.tier ?? p.expectedTier
                  const tierC = TIER_COLORS[previewTier]
                  const isActive = to === p.to && agentName === p.agentName
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left group",
                        isActive
                          ? "bg-vanta-elevated border-vanta-teal/30"
                          : "border-transparent hover:border-border hover:bg-vanta-elevated/50"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", tierC.dot ?? "bg-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-medium leading-tight truncate transition-colors", isActive ? "text-vanta-teal" : "text-foreground group-hover:text-vanta-teal")}>
                          {p.label}
                        </p>
                        {p.attackType && (
                          <p className="text-[9px] text-vanta-red mt-0.5 flex items-center gap-0.5">
                            <Bug size={8} />{p.attackType}
                          </p>
                        )}
                      </div>
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0", tierC.bg, tierC.text)}>
                        T{previewTier}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Right: Form + result ── */}
            <div className="p-4 space-y-4">

              {/* Compact form */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-vanta-text-muted mb-1 block">Agent</label>
                    <Input
                      placeholder="demo-trading-bot"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="bg-vanta-elevated border-border text-foreground text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-vanta-text-muted mb-1 block">From</label>
                    <div className="font-mono text-[10px] text-vanta-text-secondary bg-vanta-elevated border border-border rounded-lg px-3 h-8 flex items-center gap-1 truncate">
                      {shortenAddr(address)}
                      <a href={`${SEPOLIA_EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-vanta-text-muted hover:text-vanta-teal shrink-0">
                        <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-vanta-text-muted mb-1 block">To address</label>
                  <Input
                    placeholder="0x…"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="bg-vanta-elevated border-border text-foreground font-mono text-xs h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-vanta-text-muted mb-1 block">ETH amount</label>
                    <Input
                      placeholder="0.0"
                      value={eth}
                      onChange={(e) => setEth(e.target.value)}
                      className="bg-vanta-elevated border-border text-foreground font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-vanta-text-muted mb-1 block">≈ USD</label>
                    <div className="font-mono text-xs text-vanta-text-muted bg-vanta-elevated border border-border rounded-lg px-3 h-8 flex items-center">
                      ${(parseFloat(eth || "0") * 2400).toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-[10px] text-vanta-text-muted hover:text-foreground transition-colors"
                >
                  <ChevronDown size={12} className={cn("transition-transform", showAdvanced && "rotate-180")} />
                  {showAdvanced ? "Hide" : "Show"} calldata
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea
                        placeholder="0x…"
                        value={calldata}
                        onChange={(e) => setCalldata(e.target.value)}
                        rows={2}
                        className="w-full bg-vanta-elevated border border-border text-foreground font-mono text-[10px] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-vanta-teal"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <Button
                onClick={simulate}
                disabled={loading || !to}
                className="w-full bg-gradient-to-r from-vanta-teal to-emerald-500 text-vanta-bg hover:from-vanta-teal/90 hover:to-emerald-500/90 h-9 text-xs font-medium"
              >
                {loading ? (
                  <><InfinityLoader size={14} className="mr-2" />Processing…</>
                ) : (
                  <><Play size={13} className="mr-2" />Simulate transaction</>
                )}
              </Button>

            {/* Live simulation steps */}
            <AnimatePresence>
              {steps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-vanta-elevated/50 border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal size={14} className="text-vanta-teal" />
                      <span className="text-[11px] text-vanta-text-muted uppercase tracking-wider">Pipeline Execution</span>
                    </div>
                    {steps.map((step, i) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 text-xs"
                      >
                        <div className="mt-0.5 shrink-0">
                          {step.status === "pending" && <div className="w-3.5 h-3.5 rounded-full border border-border" />}
                          {step.status === "running" && <InfinityLoader size={14} />}
                          {step.status === "done" && <Check size={14} className="text-emerald-400" />}
                          {step.status === "error" && <XCircle size={14} className="text-vanta-red" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={cn(
                            "font-medium",
                            step.status === "running" ? "text-vanta-teal" :
                            step.status === "done" ? "text-foreground" :
                            step.status === "error" ? "text-vanta-red" :
                            "text-vanta-text-muted"
                          )}>
                            {step.label}
                          </span>
                          {step.detail && (
                            <p className="text-[10px] text-vanta-text-muted mt-0.5 truncate">{step.detail}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-xs text-vanta-red flex items-start gap-2"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Result Panel ──────────────────────────────────────── */}
            <AnimatePresence>
              {result && tierInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn("rounded-xl border overflow-hidden", tierInfo.border)}
                >
                  {/* Tier banner */}
                  <div className={cn("px-4 py-3 flex items-center justify-between", tierInfo.bg)}>
                    <div className="flex items-center gap-2">
                      <TierIcon size={18} className={tierInfo.text} />
                      <span className={cn("text-sm font-medium", tierInfo.text)}>{tierInfo.label}</span>
                    </div>
                    <span className={cn("text-xs font-mono capitalize", tierInfo.text)}>{result.status}</span>
                  </div>

                  <div className="p-4 bg-vanta-elevated/50 space-y-4">
                    {/* Key metrics row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2.5 bg-vanta-surface rounded-lg border border-border">
                        <div className="text-[10px] text-vanta-text-muted mb-1">Risk Score</div>
                        <div className={cn(
                          "font-mono text-lg font-bold",
                          result.scanResult.riskScore >= 70 ? "text-vanta-red" :
                          result.scanResult.riskScore >= 30 ? "text-vanta-amber" : "text-emerald-400"
                        )}>
                          {result.scanResult.riskScore}
                          <span className="text-xs text-vanta-text-muted">/100</span>
                        </div>
                      </div>
                      <div className="text-center p-2.5 bg-vanta-surface rounded-lg border border-border">
                        <div className="text-[10px] text-vanta-text-muted mb-1">AI Verdict</div>
                        <div className={cn(
                          "text-sm font-medium capitalize",
                          result.scanResult.recommendation === "block" ? "text-vanta-red" :
                          result.scanResult.recommendation === "flag" ? "text-vanta-amber" : "text-emerald-400"
                        )}>
                          {result.scanResult.recommendation}
                        </div>
                      </div>
                      <div className="text-center p-2.5 bg-vanta-surface rounded-lg border border-border">
                        <div className="text-[10px] text-vanta-text-muted mb-1">World ID</div>
                        <div className={cn("text-sm font-medium", result.worldIdVerified ? "text-vanta-teal" : "text-vanta-text-muted")}>
                          {result.worldIdVerified ? "2x Limit" : "Standard"}
                        </div>
                      </div>
                    </div>

                    {/* Policy result */}
                    <div className="space-y-2">
                      <div className="text-[11px] text-vanta-text-muted font-medium">Policy Engine</div>
                      <div className="p-3 bg-vanta-surface rounded-lg border border-border text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-vanta-text-muted">Reason</span>
                          <span className="text-foreground text-right max-w-[60%]">{result.policyResult.reason}</span>
                        </div>
                        {result.policyResult.matchedRules.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-vanta-text-muted">Matched rules</span>
                            <span className="text-foreground">{result.policyResult.matchedRules.length}</span>
                          </div>
                        )}
                        {result.worldIdRequired && (
                          <div className="flex items-center gap-2 mt-1 text-vanta-amber">
                            <AlertTriangle size={12} />
                            <span>World ID required to override</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Scanner checks */}
                    {result.scanResult.checks && result.scanResult.checks.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] text-vanta-text-muted font-medium">AI Scanner Checks</div>
                        <div className="space-y-1">
                          {result.scanResult.checks.map((check, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-vanta-surface rounded-lg border border-border text-xs">
                              {check.passed ? (
                                <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle size={14} className="text-vanta-red shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="text-foreground font-medium">{check.name}</span>
                                <span className="text-vanta-text-muted"> — {check.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI reasoning */}
                    <div className="p-3 bg-vanta-surface rounded-lg border border-border">
                      <div className="text-[10px] text-vanta-text-muted mb-1.5 flex items-center gap-1">
                        <Zap size={10} />
                        {result.scanResult.model === "skipped"
                          ? "AI scan skipped — policy only"
                          : `AI Assessment — ${result.scanResult.model || "Gemini 3 Flash"}`}
                      </div>
                      <p className="text-xs text-foreground">{result.scanResult.reasoning}</p>
                    </div>

                    {/* TX ID + explorer link + detail modal button */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-vanta-surface rounded-lg border border-border text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-vanta-text-muted">TX ID</span>
                        <span className="font-mono text-foreground">{result.txId.slice(0, 12)}...{result.txId.slice(-6)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailModal(result)}
                          className="text-vanta-teal hover:underline text-[11px]"
                        >
                          View full details →
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(result.txId)}
                          className="text-vanta-text-muted hover:text-foreground"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Status-specific banners */}
                    {result.status === "pending" && (
                      <div className="p-3 bg-vanta-amber/10 border border-vanta-amber/20 rounded-lg text-[11px] text-vanta-amber flex items-start gap-2">
                        <Clock size={14} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Awaiting human confirmation</p>
                          <p className="mt-0.5 opacity-80">Open your Dashboard — the confirmation modal is waiting. Use your configured verification method to approve or reject.</p>
                        </div>
                      </div>
                    )}
                    {result.status === "blocked" && (
                      <div className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-[11px] text-vanta-red flex items-start gap-2">
                        <Skull size={14} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Transaction blocked by VANTA</p>
                          <p className="mt-0.5 opacity-80">
                            {result.worldIdRequired
                              ? "This can only be overridden with a World ID proof of human. Go to Settings to verify."
                              : "The policy engine and AI scanner determined this transaction is too risky to proceed."
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    {result.status === "approved" && (
                      <div className="p-3 bg-emerald-400/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-400 flex items-start gap-2">
                        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Auto-approved by VANTA</p>
                          <p className="mt-0.5 opacity-80">All checks passed. Transaction is within policy limits and the AI scanner found no threats. On Sepolia testnet — no real funds moved.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulation history */}
            {history.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-vanta-text-muted font-medium">Recent simulations</span>
                  <button onClick={() => setHistory([])} className="text-[10px] text-vanta-text-muted hover:text-foreground flex items-center gap-1">
                    <RefreshCw size={10} /> Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {history.slice(1, 6).map((h) => {
                    const tc = TIER_COLORS[h.tier as 1 | 2 | 3]
                    return (
                      <button
                        key={h.txId}
                        onClick={() => setDetailModal(h)}
                        className="w-full flex items-center gap-3 px-3 py-2 bg-vanta-elevated rounded-lg text-xs hover:border-vanta-teal/30 border border-transparent transition-colors text-left"
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", h.tier === 1 ? "bg-emerald-400" : h.tier === 2 ? "bg-vanta-amber" : "bg-vanta-red")} />
                        <span className="font-mono text-vanta-text-muted text-[10px] w-20">{h.txId.slice(0, 8)}…</span>
                        <span className={cn("text-[10px] font-medium", tc.text)}>{tc.label.split(" · ")[1]}</span>
                        <span className="ml-auto text-vanta-text-muted">{h.scanResult.riskScore}/100</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* MCP endpoint footer */}
      <div className="px-5 py-3 border-t border-border bg-vanta-elevated/30">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-vanta-text-muted">
            MCP endpoint: <code className="text-vanta-teal font-mono">/api/mcp</code> · REST: <code className="text-vanta-teal font-mono">/api/transactions/submit</code>
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp`)}
            className="text-[10px] text-vanta-text-muted hover:text-foreground flex items-center gap-1"
          >
            <Copy size={10} /> Copy
          </button>
        </div>
      </div>
    </div>

    {/* Detail Modal Portal */}
    <AnimatePresence>
      {detailModal && (
        <SimulationDetailModal
          result={detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}
    </AnimatePresence>
    </>
  )
}

// ─── Agent Card ────────────────────────────────────────────────────────────

interface AgentInfo {
  id: string
  name: string
  ens?: string
  active: boolean
  txnsToday: number
  volumeToday: number
  blocked: number
  permissions: { name: string; allowed: boolean }[]
}

function PulsingDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
    </span>
  )
}

function AgentCard({ agent, onToggle }: { agent: AgentInfo; onToggle: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-vanta-surface border border-border rounded-xl p-5"
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          agent.active ? "bg-vanta-teal/10" : "bg-vanta-elevated"
        )}>
          <Bot size={24} className={agent.active ? "text-vanta-teal" : "text-vanta-text-muted"} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm text-foreground">{agent.name}</h3>
            {agent.active && <PulsingDot />}
          </div>
          {agent.ens && (
            <p className="font-mono text-xs text-vanta-text-muted mb-2 truncate">{agent.ens}</p>
          )}
          <p className="text-xs text-vanta-text-secondary">
            {agent.txnsToday} txns today · ${agent.volumeToday.toLocaleString()} volume · {agent.blocked} blocked
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.permissions.map((perm) => (
              <span
                key={perm.name}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px]",
                  perm.allowed ? "bg-vanta-teal/10 text-vanta-teal" : "bg-vanta-red/10 text-vanta-red"
                )}
              >
                {perm.name} {perm.allowed ? "✓" : "✗"}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={agent.active}
            onCheckedChange={() => onToggle(agent.id)}
            className="data-[state=checked]:bg-vanta-teal"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 text-vanta-text-muted hover:text-foreground transition-colors">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-vanta-surface border-border">
              <DropdownMenuItem className="text-vanta-text-secondary hover:text-foreground">Edit permissions</DropdownMenuItem>
              <DropdownMenuItem className="text-vanta-text-secondary hover:text-foreground">View logs</DropdownMenuItem>
              <DropdownMenuItem className="text-vanta-red hover:text-vanta-red">Disconnect</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

const defaultAgents: AgentInfo[] = [
  {
    id: "1",
    name: "DeFi Trading Bot",
    ens: "trader.vanta.eth",
    active: true,
    txnsToday: 12,
    volumeToday: 2840,
    blocked: 1,
    permissions: [
      { name: "Swap", allowed: true },
      { name: "Transfer", allowed: true },
      { name: "Approve", allowed: false },
      { name: "Deploy", allowed: false },
    ],
  },
  {
    id: "2",
    name: "Portfolio Rebalancer",
    ens: "rebalancer.vanta.eth",
    active: false,
    txnsToday: 0,
    volumeToday: 0,
    blocked: 0,
    permissions: [
      { name: "Swap", allowed: true },
      { name: "Transfer", allowed: false },
      { name: "Approve", allowed: false },
    ],
  },
]

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>(defaultAgents)

  const handleToggle = (id: string) => {
    setAgents(agents.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }

  return (
    <DashboardLayout title="Agents">
      <div className="space-y-6">
        <AgentSimulator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-foreground">Connected agents</h2>
            <Button
              variant="outline"
              className="border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg"
            >
              <Plus size={16} className="mr-2" />
              Connect new
            </Button>
          </div>
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AgentCard agent={agent} onToggle={handleToggle} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
