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
  Clock,
  Copy,
  Terminal,
  Loader2,
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

// ─── Agent Simulator ────────────────────────────────────────────────────────

interface SimulationResult {
  txId: string
  tier: number
  status: string
  policyResult: { tier: number; reason: string; matchedRules: string[] }
  scanResult: { riskScore: number; recommendation: string; reasoning: string }
}

// Real calldata encodings for common Ethereum operations
// ERC-20 transfer(address,uint256) — 0xa9059cbb
const ERC20_TRANSFER = (to: string, amount: string) =>
  `0xa9059cbb${to.replace("0x", "").padStart(64, "0")}${BigInt(amount).toString(16).padStart(64, "0")}`

// ERC-20 approve(address,uint256) — 0x095ea7b3
const ERC20_APPROVE = (spender: string, amount: string) =>
  `0x095ea7b3${spender.replace("0x", "").padStart(64, "0")}${BigInt(amount).toString(16).padStart(64, "0")}`

const MAX_UINT256 = "f".repeat(64)

// Uniswap V3 exactInputSingle — 0x414bf389
// struct: tokenIn, tokenOut, fee, recipient, deadline, amountIn, amountOutMinimum, sqrtPriceLimitX96
const UNISWAP_SWAP = (recipient: string) =>
  `0x414bf389` +
  `${"c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".padStart(64, "0")}` + // WETH
  `${"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".padStart(64, "0")}` + // USDC
  `${"0bb8".padStart(64, "0")}` + // fee 3000
  `${recipient.replace("0x", "").padStart(64, "0")}` +
  `${(Math.floor(Date.now() / 1000) + 1200).toString(16).padStart(64, "0")}` + // deadline
  `${BigInt("500000000000000000").toString(16).padStart(64, "0")}` + // 0.5 ETH
  `${"0".padStart(64, "0")}` + // amountOutMinimum
  `${"0".padStart(64, "0")}` // sqrtPriceLimitX96

// Aave V3 supply(address,uint256,address,uint16) — 0x617ba037
const AAVE_SUPPLY = (asset: string, amount: string, onBehalfOf: string) =>
  `0x617ba037` +
  `${asset.replace("0x", "").padStart(64, "0")}` +
  `${BigInt(amount).toString(16).padStart(64, "0")}` +
  `${onBehalfOf.replace("0x", "").padStart(64, "0")}` +
  `${"0".padStart(64, "0")}` // referralCode

// transferOwnership(address) — 0xf2fde38b
const TRANSFER_OWNERSHIP = (newOwner: string) =>
  `0xf2fde38b${newOwner.replace("0x", "").padStart(64, "0")}`

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
const KNOWN_SAFE = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
const UNKNOWN_ADDR = "0xdEaD000000000000000000000000000000000000"

const presets = [
  {
    label: "Small ETH transfer",
    to: KNOWN_SAFE,
    eth: "0.01",
    description: "Simple transfer under limits → Tier 1 auto-approve",
    category: "transfer" as const,
  },
  {
    label: "Large ETH transfer",
    to: KNOWN_SAFE,
    eth: "2.5",
    description: "Above per-tx limit → Tier 2 confirmation",
    category: "transfer" as const,
  },
  {
    label: "ERC-20 token transfer",
    to: SEPOLIA_USDC,
    eth: "0",
    data: ERC20_TRANSFER(KNOWN_SAFE, "1000000000"), // 1000 USDC (6 decimals)
    description: "Transfer 1,000 USDC via contract call",
    category: "token" as const,
  },
  {
    label: "Safe token approval",
    to: SEPOLIA_USDC,
    eth: "0",
    data: ERC20_APPROVE(UNISWAP_ROUTER, "5000000000"), // 5000 USDC
    description: "Approve 5,000 USDC for Uniswap — bounded amount",
    category: "defi" as const,
  },
  {
    label: "Unlimited approval",
    to: SEPOLIA_USDC,
    eth: "0",
    data: `0x095ea7b3${UNISWAP_ROUTER.replace("0x", "").padStart(64, "0")}${MAX_UINT256}`,
    description: "Approve max uint256 → Tier 3 blocked",
    category: "danger" as const,
  },
  {
    label: "Uniswap V3 swap",
    to: UNISWAP_ROUTER,
    eth: "0.5",
    dataFn: true, // computed at runtime with user address
    description: "Swap 0.5 ETH → USDC on Uniswap V3",
    category: "defi" as const,
  },
  {
    label: "Aave V3 supply",
    to: AAVE_POOL,
    eth: "0",
    dataFn: true,
    description: "Supply 500 USDC to Aave lending pool",
    category: "defi" as const,
  },
  {
    label: "Transfer to unknown",
    to: UNKNOWN_ADDR,
    eth: "1.0",
    description: "Send 1 ETH to unknown address → flagged if whitelist active",
    category: "transfer" as const,
  },
  {
    label: "Ownership transfer",
    to: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    eth: "0",
    data: TRANSFER_OWNERSHIP(UNKNOWN_ADDR),
    description: "transferOwnership() → high risk, scanner flags",
    category: "danger" as const,
  },
]

const categoryColors = {
  transfer: "bg-blue-500/10 text-blue-400",
  token: "bg-purple-500/10 text-purple-400",
  defi: "bg-vanta-teal/10 text-vanta-teal",
  danger: "bg-vanta-red/10 text-vanta-red",
}

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
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(preset: typeof presets[number]) {
    setTo(preset.to)
    setEth(preset.eth)
    // Compute calldata for presets that need user address
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

  const tierBadge = (tier: number) => {
    if (tier === 1) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400/10 text-emerald-400">Tier 1 · Auto</span>
    if (tier === 2) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-vanta-amber/10 text-vanta-amber">Tier 2 · Confirm</span>
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-vanta-red/10 text-vanta-red">Tier 3 · Blocked</span>
  }

  const statusIcon = (status: string) => {
    if (status === "approved") return <ShieldCheck size={16} className="text-emerald-400" />
    if (status === "pending") return <Clock size={16} className="text-vanta-amber" />
    return <AlertTriangle size={16} className="text-vanta-red" />
  }

  return (
    <div className="bg-vanta-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-vanta-teal/10 flex items-center justify-center">
          <Terminal size={16} className="text-vanta-teal" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Agent Simulator</h3>
          <p className="text-[11px] text-vanta-text-muted">Simulate agent transactions through the VANTA pipeline</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {!address ? (
          <p className="text-xs text-vanta-text-muted text-center py-4">Connect your wallet to simulate transactions</p>
        ) : (
          <>
            {/* Presets */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-2 block">Simulation presets</label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="flex flex-col items-start gap-1 px-3 py-2 bg-vanta-elevated border border-border rounded-lg hover:border-vanta-teal/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", categoryColors[p.category])}>
                        {p.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-foreground leading-tight">{p.label}</span>
                    <span className="text-[10px] text-vanta-text-muted leading-tight">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent name */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-1 block">Agent name</label>
              <Input
                placeholder="demo-trading-bot"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="bg-vanta-elevated border-border-hover text-foreground text-xs h-9"
              />
            </div>

            {/* From */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-1 block">From</label>
              <div className="font-mono text-xs text-vanta-text-secondary bg-vanta-elevated border border-border rounded-lg px-3 py-2 truncate">
                {address}
              </div>
            </div>

            {/* To */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-1 block">To</label>
              <Input
                placeholder="0x…"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-vanta-elevated border-border-hover text-foreground font-mono text-xs h-9"
              />
            </div>

            {/* ETH amount */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-1 block">ETH amount</label>
              <Input
                placeholder="0.0"
                value={eth}
                onChange={(e) => setEth(e.target.value)}
                className="bg-vanta-elevated border-border-hover text-foreground font-mono text-xs h-9"
              />
            </div>

            {/* Calldata (optional) */}
            <div>
              <label className="text-[11px] text-vanta-text-muted mb-1 block">Calldata (optional)</label>
              <Input
                placeholder="0x…"
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
                className="bg-vanta-elevated border-border-hover text-foreground font-mono text-xs h-9"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={simulate}
              disabled={loading || !to}
              className="w-full bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 h-10"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Play size={16} className="mr-2" />
              )}
              {loading ? "Processing through VANTA…" : "Simulate agent transaction"}
            </Button>

            {/* Error */}
            {error && (
              <div className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-xs text-vanta-red">
                {error}
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 bg-vanta-elevated rounded-xl border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(result.status)}
                      <span className="text-sm text-foreground capitalize">{result.status}</span>
                    </div>
                    {tierBadge(result.tier)}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-vanta-text-muted">Transaction ID</span>
                      <span className="font-mono text-foreground">{result.txId.slice(0, 8)}…</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-vanta-text-muted">Policy</span>
                      <span className="text-foreground">{result.policyResult.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-vanta-text-muted">Risk score</span>
                      <span className={cn(
                        "font-mono",
                        result.scanResult.riskScore >= 70 ? "text-vanta-red" :
                        result.scanResult.riskScore >= 30 ? "text-vanta-amber" : "text-emerald-400"
                      )}>
                        {result.scanResult.riskScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-vanta-text-muted">AI verdict</span>
                      <span className="text-foreground capitalize">{result.scanResult.recommendation}</span>
                    </div>
                  </div>

                  {result.status === "pending" && (
                    <div className="p-2.5 bg-vanta-amber/10 rounded-lg text-[11px] text-vanta-amber flex items-start gap-2">
                      <Clock size={14} className="mt-0.5 shrink-0" />
                      <span>Confirmation modal will appear on your Dashboard. Go approve or reject it there.</span>
                    </div>
                  )}
                  {result.status === "blocked" && (
                    <div className="p-2.5 bg-vanta-red/10 rounded-lg text-[11px] text-vanta-red flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>This transaction was blocked by the VANTA policy engine. It cannot proceed.</span>
                    </div>
                  )}
                  {result.status === "approved" && (
                    <div className="p-2.5 bg-emerald-400/10 rounded-lg text-[11px] text-emerald-400 flex items-start gap-2">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                      <span>Auto-approved. Within policy limits. On testnet this is simulated.</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* MCP endpoint info */}
      <div className="px-5 py-3 border-t border-border bg-vanta-elevated/30">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-vanta-text-muted">
            MCP endpoint: <code className="text-vanta-teal font-mono">/api/mcp</code>
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp`)}
            className="text-[10px] text-vanta-text-muted hover:text-foreground flex items-center gap-1"
          >
            <Copy size={10} /> Copy
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Agent Card (existing agents list) ──────────────────────────────────────

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

// ─── Page ───────────────────────────────────────────────────────────────────

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
    setAgents(agents.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  return (
    <DashboardLayout title="Agents">
      <div className="space-y-6">
        {/* Agent Simulator — this is the demo money shot */}
        <AgentSimulator />

        {/* Connected agents */}
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
