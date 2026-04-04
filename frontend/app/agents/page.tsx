"use client"

import { useState } from "react"
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
  Loader2,
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
import { useDynamic } from "@/lib/dynamic/context"

// ─── Types ─────────────────────────────────────────────────────────────────

interface SimulationResult {
  txId: string
  tier: number
  status: string
  policyResult: { tier: number; reason: string; matchedRules: string[] }
  scanResult: { riskScore: number; recommendation: string; reasoning: string; checks?: { name: string; passed: boolean; detail: string }[] }
  worldIdRequired?: boolean
  worldIdVerified?: boolean
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

// ─── Tier colors ───────────────────────────────────────────────────────────

const TIER_COLORS = {
  1: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    label: "Tier 1 · Auto-Approved",
    icon: ShieldCheck,
  },
  2: {
    bg: "bg-vanta-amber/10",
    border: "border-vanta-amber/30",
    text: "text-vanta-amber",
    label: "Tier 2 · Needs Confirmation",
    icon: Clock,
  },
  3: {
    bg: "bg-vanta-red/10",
    border: "border-vanta-red/30",
    text: "text-vanta-red",
    label: "Tier 3 · Blocked",
    icon: XCircle,
  },
} as const

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io"

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ─── Agent Simulator ───────────────────────────────────────────────────────

function AgentSimulator() {
  const { wallet } = useDynamic()
  const { user } = useUser()
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

  const address = wallet?.address

  async function simulate() {
    if (!address || !to) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
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
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? "Request failed")
      }
      const data = await res.json()
      setResult(data)
      setHistory((prev) => [data, ...prev].slice(0, 20))
    } catch (e: unknown) {
      setError((e as Error).message)
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
    setError("")
  }

  const filteredPresets = activeCategory === "all" ? presets : presets.filter((p) => p.category === activeCategory)

  const tierInfo = result ? TIER_COLORS[result.tier as 1 | 2 | 3] : null
  const TierIcon = tierInfo?.icon ?? ShieldCheck

  return (
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
        <div className="flex items-center gap-2 text-[10px] text-vanta-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Sepolia · Chain 11155111
        </div>
      </div>

      <div className="p-5 space-y-5">
        {!address ? (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto mb-3 text-vanta-text-muted" />
            <p className="text-sm text-vanta-text-muted">Connect your wallet to simulate transactions</p>
            <p className="text-[11px] text-vanta-text-muted mt-1">All simulations run on Sepolia testnet</p>
          </div>
        ) : (
          <>
            {/* Category filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors shrink-0",
                  activeCategory === "all"
                    ? "bg-vanta-elevated border-vanta-teal/30 text-vanta-teal"
                    : "border-border text-vanta-text-muted hover:text-foreground hover:border-border-hover"
                )}
              >
                All ({presets.length})
              </button>
              {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META.safe][]).map(([key, meta]) => {
                const Icon = meta.icon
                const count = presets.filter((p) => p.category === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors shrink-0 flex items-center gap-1.5",
                      activeCategory === key
                        ? `${meta.color} border-current/20`
                        : "border-border text-vanta-text-muted hover:text-foreground hover:border-border-hover"
                    )}
                  >
                    <Icon size={12} />
                    {meta.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Category description */}
            {activeCategory !== "all" && (
              <p className="text-[11px] text-vanta-text-muted -mt-2">
                {CATEGORY_META[activeCategory].description}
              </p>
            )}

            {/* Preset grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredPresets.map((p) => {
                const tierC = TIER_COLORS[p.expectedTier]
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="flex flex-col items-start gap-1.5 px-3 py-2.5 bg-vanta-elevated border border-border rounded-lg hover:border-vanta-teal/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium border", CATEGORY_META[p.category].color)}>
                        {p.category}
                      </span>
                      <span className={cn("ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium", tierC.bg, tierC.text)}>
                        T{p.expectedTier}
                      </span>
                    </div>
                    <span className="text-[12px] text-foreground leading-tight font-medium group-hover:text-vanta-teal transition-colors">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-vanta-text-muted leading-tight">{p.description}</span>
                    {p.attackType && (
                      <span className="flex items-center gap-1 text-[9px] text-vanta-red mt-0.5">
                        <Bug size={9} />
                        {p.attackType}
                      </span>
                    )}
                    <span className="text-[9px] text-vanta-text-muted font-mono">
                      Agent: {p.agentName}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Advanced fields toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-vanta-text-muted hover:text-foreground transition-colors"
            >
              <ChevronDown size={14} className={cn("transition-transform", showAdvanced && "rotate-180")} />
              {showAdvanced ? "Hide" : "Show"} transaction fields
            </button>

            {/* Advanced input fields */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-vanta-text-muted mb-1 block">Agent name</label>
                      <Input
                        placeholder="demo-trading-bot"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="bg-vanta-elevated border-border-hover text-foreground text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-vanta-text-muted mb-1 block">From</label>
                      <div className="font-mono text-[10px] text-vanta-text-secondary bg-vanta-elevated border border-border rounded-lg px-3 py-2.5 truncate flex items-center gap-1">
                        {shortenAddr(address)}
                        <a href={`${SEPOLIA_EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-vanta-text-muted hover:text-vanta-teal">
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-vanta-text-muted mb-1 block">To address</label>
                    <Input
                      placeholder="0x…"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="bg-vanta-elevated border-border-hover text-foreground font-mono text-xs h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-vanta-text-muted mb-1 block">ETH amount</label>
                      <Input
                        placeholder="0.0"
                        value={eth}
                        onChange={(e) => setEth(e.target.value)}
                        className="bg-vanta-elevated border-border-hover text-foreground font-mono text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-vanta-text-muted mb-1 block">≈ USD</label>
                      <div className="font-mono text-xs text-vanta-text-muted bg-vanta-elevated border border-border rounded-lg px-3 py-2 h-9 flex items-center">
                        ${(parseFloat(eth || "0") * 2400).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-vanta-text-muted mb-1 block">Calldata (hex)</label>
                    <textarea
                      placeholder="0x…"
                      value={calldata}
                      onChange={(e) => setCalldata(e.target.value)}
                      rows={2}
                      className="w-full bg-vanta-elevated border border-border-hover text-foreground font-mono text-[10px] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-vanta-teal"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected transaction summary (when preset applied but fields hidden) */}
            {to && !showAdvanced && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated border border-border rounded-lg text-xs">
                <Zap size={14} className="text-vanta-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{eth ? `${eth} ETH` : "Contract call"}</span>
                  <span className="text-vanta-text-muted"> → </span>
                  <span className="font-mono text-vanta-text-secondary">{shortenAddr(to)}</span>
                  {calldata && <span className="text-vanta-text-muted"> + calldata</span>}
                </div>
                <span className="text-[10px] text-vanta-text-muted font-mono">{agentName}</span>
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={simulate}
              disabled={loading || !to}
              className="w-full bg-gradient-to-r from-vanta-teal to-emerald-500 text-vanta-bg hover:from-vanta-teal/90 hover:to-emerald-500/90 h-11 text-sm font-medium"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Processing through VANTA pipeline…
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Simulate transaction
                </>
              )}
            </Button>

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
                        AI Assessment
                      </div>
                      <p className="text-xs text-foreground">{result.scanResult.reasoning}</p>
                    </div>

                    {/* TX ID + explorer link */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-vanta-surface rounded-lg border border-border text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-vanta-text-muted">TX ID</span>
                        <span className="font-mono text-foreground">{result.txId.slice(0, 12)}...{result.txId.slice(-6)}</span>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.txId)}
                        className="text-vanta-text-muted hover:text-foreground"
                      >
                        <Copy size={12} />
                      </button>
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
                      <div key={h.txId} className="flex items-center gap-3 px-3 py-2 bg-vanta-elevated rounded-lg text-xs">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", h.tier === 1 ? "bg-emerald-400" : h.tier === 2 ? "bg-vanta-amber" : "bg-vanta-red")} />
                        <span className="font-mono text-vanta-text-muted text-[10px] w-20">{h.txId.slice(0, 8)}…</span>
                        <span className={cn("text-[10px] font-medium", tc.text)}>{tc.label.split(" · ")[1]}</span>
                        <span className="ml-auto text-vanta-text-muted">{h.scanResult.riskScore}/100</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
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
