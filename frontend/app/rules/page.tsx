"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import {
  GripVertical,
  Plus,
  ChevronDown,
  X,
  DollarSign,
  Users,
  FileCode,
  Clock,
  ShieldOff,
  Zap,
  ShieldAlert,
  Check,
  Loader2,
} from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/useUser"
import { useRules, type DbRule } from "@/hooks/useRules"

// Known mainnet contract addresses for approved DeFi protocols
const CONTRACT_ADDRESSES: Record<string, string[]> = {
  "Uniswap V3":  ["0xE592427A0AEce92De3Edee1F18E0157C05861564"],
  "Aave V3":     ["0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"],
  "Compound":    ["0xc3d688B66703497DAA19211EEdff47f25384cdc3"],
  "1inch":       ["0x1111111254EEB25477B68fb85Ed929f73A960582"],
  "Lido":        ["0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"],
  "Curve":       ["0xD533a949740bb3306d119CC777fa900bA034cd52"],
  "Uniswap V2":  ["0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"],
}

// Rule types that can sync to Dynamic Policy API (by DB type string)
const DYNAMIC_COMPATIBLE = new Set(["per_tx_limit", "whitelist", "contract_whitelist", "blacklist"])

// Human-readable labels for each DB rule type
const RULE_LABELS: Record<string, { name: string; description: string }> = {
  daily_limit:              { name: "Daily spending limit",           description: "Auto-approve transactions under this total per day" },
  per_tx_limit:             { name: "Per-transaction limit",          description: "Require confirmation for any single transaction above this amount" },
  whitelist:                { name: "Trusted addresses",              description: "Auto-approve transactions to these addresses" },
  contract_whitelist:       { name: "Approved contracts",             description: "Allow interactions with verified DeFi protocols" },
  blacklist:                { name: "Blocked addresses",              description: "Always block transactions to these addresses" },
  block_unlimited_approval: { name: "Block unlimited token approvals", description: "Hard-block any ERC-20 approve() with max uint256" },
  strip_calldata:           { name: "Strip personal data from calldata", description: "Remove names, emails, invoice numbers before broadcast" },
  quiet_hours:              { name: "Quiet hours",                    description: "Require manual confirmation during these hours regardless of amount" },
}

const quickSetAmounts = [100, 250, 500, 1000, 2500]

// Build the Dynamic policy payload from a DB rule
function toDynamicPolicy(rule: DbRule) {
  if (rule.type === "per_tx_limit") {
    return {
      chain: "EVM", chainIds: [1],
      name: RULE_LABELS[rule.type].name,
      ruleType: "allow",
      addresses: [] as string[],
      valueLimit: { maxPerCall: String(Math.round(((rule.config?.amount as number) ?? 0) * 1e18)) },
    }
  }
  if (rule.type === "whitelist") {
    const addrs = ((rule.config?.addresses ?? []) as { address: string }[]).map((a) => a.address)
    return { chain: "EVM", chainIds: [1], name: RULE_LABELS[rule.type].name, ruleType: "allow", addresses: addrs }
  }
  if (rule.type === "contract_whitelist") {
    const contracts = (rule.config?.contracts ?? []) as string[]
    const addresses = contracts.flatMap((c) => CONTRACT_ADDRESSES[c] ?? [])
    return { chain: "EVM", chainIds: [1], name: RULE_LABELS[rule.type].name, ruleType: "allow", addresses }
  }
  if (rule.type === "blacklist") {
    const addrs = ((rule.config?.addresses ?? []) as { address: string }[]).map((a) => a.address)
    return { chain: "EVM", chainIds: [1], name: RULE_LABELS[rule.type].name, ruleType: "deny", addresses: addrs }
  }
  return null
}

interface RuleCardProps {
  rule: DbRule
  onToggle: (id: string, enabled: boolean) => void
  onSave: (id: string, config: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => void
}

function RuleCard({ rule, onToggle, onSave, onDelete }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(rule.config)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newAddress, setNewAddress] = useState("")
  const [newLabel, setNewLabel] = useState("")

  const isDynamic = DYNAMIC_COMPATIBLE.has(rule.type)
  const label = RULE_LABELS[rule.type] ?? { name: rule.type, description: "" }

  const hasEditView = ["daily_limit", "per_tx_limit", "whitelist", "contract_whitelist", "blacklist", "quiet_hours"].includes(rule.type)

  async function handleSave() {
    setSaving(true)
    await onSave(rule.id, localConfig)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addAddressToList(field: string) {
    if (!newAddress.trim()) return
    const existing = (localConfig[field] ?? []) as { address: string; label: string }[]
    setLocalConfig({ ...localConfig, [field]: [...existing, { address: newAddress.trim(), label: newLabel.trim() }] })
    setNewAddress("")
    setNewLabel("")
  }

  function removeAddressFromList(field: string, index: number) {
    const existing = (localConfig[field] ?? []) as unknown[]
    setLocalConfig({ ...localConfig, [field]: existing.filter((_, i) => i !== index) })
  }

  const renderEditView = () => {
    switch (rule.type) {
      case "daily_limit":
      case "per_tx_limit": {
        const amount = (localConfig.amount as number) ?? 0
        return (
          <div className="pt-4 space-y-4">
            <Slider
              value={[amount]}
              min={0}
              max={rule.type === "daily_limit" ? 10000 : 5000}
              step={50}
              onValueChange={([v]) => setLocalConfig({ ...localConfig, amount: v })}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-vanta-teal [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&>span:first-child]:bg-vanta-elevated [&>span:first-child>span]:bg-vanta-teal"
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg text-foreground">${amount.toLocaleString()}</span>
              <div className="flex gap-2">
                {quickSetAmounts.map((a) => (
                  <button
                    key={a}
                    onClick={() => setLocalConfig({ ...localConfig, amount: a })}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs transition-colors",
                      amount === a ? "bg-vanta-teal/10 text-vanta-teal" : "bg-vanta-elevated text-vanta-text-muted hover:text-foreground"
                    )}
                  >
                    ${a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      case "whitelist":
      case "blacklist": {
        const field = "addresses"
        const addresses = (localConfig[field] ?? []) as { address: string; label: string }[]
        const isBlacklist = rule.type === "blacklist"
        return (
          <div className="pt-4 space-y-3">
            {addresses.map((addr, index) => (
              <div key={index} className="flex items-center gap-3 bg-vanta-elevated rounded-lg px-3 py-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", isBlacklist ? "bg-vanta-red" : "bg-vanta-teal")} />
                <span className="font-mono text-[13px] text-foreground flex-1 truncate">{addr.address}</span>
                {addr.label && <span className="text-xs text-vanta-text-muted">{addr.label}</span>}
                <button onClick={() => removeAddressFromList(field, index)} className="text-vanta-text-muted hover:text-vanta-red transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="0x… or ENS name"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-1 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-sm"
              />
              <Input
                placeholder="Label (optional)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-32 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted text-sm"
              />
              <Button
                variant="outline"
                onClick={() => addAddressToList(field)}
                className={cn("border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg", isBlacklist && "border-vanta-red text-vanta-red hover:bg-vanta-red")}
              >
                {isBlacklist ? "Block" : "Add"}
              </Button>
            </div>
          </div>
        )
      }

      case "contract_whitelist": {
        const enabled = (localConfig.contracts ?? []) as string[]
        return (
          <div className="pt-4">
            <div className="flex flex-wrap gap-2">
              {Object.keys(CONTRACT_ADDRESSES).map((name) => {
                const on = enabled.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => {
                      const next = on ? enabled.filter((c) => c !== name) : [...enabled, name]
                      setLocalConfig({ ...localConfig, contracts: next })
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs transition-colors",
                      on ? "bg-vanta-teal/10 text-vanta-teal" : "bg-vanta-elevated text-vanta-text-muted hover:text-foreground"
                    )}
                  >
                    {name} {on && "✓"}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      case "quiet_hours":
        return (
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-vanta-text-muted mb-1 block">From</label>
                <Input
                  type="time"
                  value={(localConfig.from as string) ?? "02:00"}
                  onChange={(e) => setLocalConfig({ ...localConfig, from: e.target.value })}
                  className="bg-vanta-elevated border-border-hover text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-vanta-text-muted mb-1 block">To</label>
                <Input
                  type="time"
                  value={(localConfig.to as string) ?? "06:00"}
                  onChange={(e) => setLocalConfig({ ...localConfig, to: e.target.value })}
                  className="bg-vanta-elevated border-border-hover text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-vanta-text-muted mb-1 block">Timezone</label>
              <select
                value={(localConfig.timezone as string) ?? "UTC"}
                onChange={(e) => setLocalConfig({ ...localConfig, timezone: e.target.value })}
                className="w-full bg-vanta-elevated border border-border-hover text-foreground rounded-lg px-3 py-2 text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
                <option value="CET">CET</option>
              </select>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="cursor-grab text-vanta-text-muted hover:text-foreground transition-colors">
          <GripVertical size={18} />
        </div>
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
          className="data-[state=checked]:bg-vanta-teal"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm text-foreground">{label.name}</h3>
            {isDynamic && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium shrink-0">
                <Zap size={10} />
                Dynamic
              </span>
            )}
          </div>
          <p className="text-xs text-vanta-text-muted truncate">{label.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasEditView && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-vanta-text-secondary hover:text-foreground transition-colors flex items-center gap-1"
            >
              Edit
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} />
              </motion.div>
            </button>
          )}
          <button
            onClick={() => onDelete(rule.id)}
            className="text-xs text-vanta-text-muted hover:text-vanta-red transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasEditView && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border">
              {renderEditView()}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                  className="bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 min-w-[80px]"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : saved ? (
                    <><Check size={14} className="mr-1" /> Saved</>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Templates shown in the Add Rule modal
const ruleTemplates = [
  { type: "daily_limit",              name: "Daily limit",             icon: DollarSign,  defaultConfig: { amount: 500 } },
  { type: "per_tx_limit",             name: "Per-tx limit",            icon: DollarSign,  defaultConfig: { amount: 200 } },
  { type: "whitelist",                name: "Trusted addresses",       icon: Users,       defaultConfig: { addresses: [] } },
  { type: "blacklist",                name: "Blocked addresses",       icon: ShieldAlert, defaultConfig: { addresses: [] } },
  { type: "contract_whitelist",       name: "Approved contracts",      icon: FileCode,    defaultConfig: { contracts: [] } },
  { type: "quiet_hours",              name: "Quiet hours",             icon: Clock,       defaultConfig: { from: "02:00", to: "06:00", timezone: "UTC" } },
  { type: "block_unlimited_approval", name: "Block ∞ approvals",       icon: ShieldOff,   defaultConfig: {} },
  { type: "strip_calldata",           name: "Strip calldata",          icon: Zap,         defaultConfig: {} },
]

interface AddRuleModalProps {
  onClose: () => void
  onAdd: (type: string, defaultConfig: Record<string, unknown>) => void
}

function AddRuleModal({ onClose, onAdd }: AddRuleModalProps) {
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
        className="relative w-full max-w-md bg-vanta-surface border border-border rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-vanta-text-muted hover:text-foreground transition-colors">
          <X size={20} />
        </button>

        <h2 className="font-mono text-lg text-foreground mb-2">Add rule</h2>
        <p className="text-xs text-vanta-text-muted mb-6">Rules tagged <span className="text-blue-400">Dynamic</span> are enforced in the TEE at signing time.</p>

        <div className="grid grid-cols-2 gap-3">
          {ruleTemplates.map((tmpl) => {
            const Icon = tmpl.icon
            const isDynamic = DYNAMIC_COMPATIBLE.has(tmpl.type)
            return (
              <motion.button
                key={tmpl.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAdd(tmpl.type, tmpl.defaultConfig)}
                className="flex flex-col items-start gap-2 p-4 bg-vanta-elevated border border-border rounded-xl hover:border-vanta-teal/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <Icon size={20} className="text-vanta-text-secondary" />
                  {isDynamic && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
                      <Zap size={8} />
                      Dynamic
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground leading-snug">{tmpl.name}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Sync a single rule to Dynamic Policy API
async function syncWithDynamic(rule: DbRule) {
  const policy = toDynamicPolicy(rule)
  if (!policy) return

  const existingId = rule.config?.dynamic_rule_id as string | undefined
  const body = existingId
    ? { rulesToUpdate: [{ id: existingId, ...policy }] }
    : { rulesToAdd: [policy] }

  const res = await fetch("/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null

  const data = await res.json()
  return (data?.rulesToAdd?.[0]?.id ?? data?.rulesToUpdate?.[0]?.id) as string | undefined
}

async function deleteFromDynamic(rule: DbRule) {
  const ruleId = rule.config?.dynamic_rule_id as string | undefined
  if (!ruleId) return
  await fetch("/api/rules", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ruleIdsToDelete: [ruleId] }),
  })
}

export default function RulesPage() {
  const { user, loading: userLoading } = useUser()
  const { rules, loading: rulesLoading, toggleRule, updateConfig, addRule, deleteRule } = useRules(user?.id)
  const [showAddModal, setShowAddModal] = useState(false)
  const syncing = useRef<Set<string>>(new Set())

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleRule(id, enabled)
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    if (DYNAMIC_COMPATIBLE.has(rule.type)) {
      if (enabled) syncWithDynamic({ ...rule, enabled })
      else deleteFromDynamic(rule)
    }
  }

  const handleSave = async (id: string, config: Record<string, unknown>) => {
    await updateConfig(id, config)
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    if (DYNAMIC_COMPATIBLE.has(rule.type) && rule.enabled && !syncing.current.has(id)) {
      syncing.current.add(id)
      const returnedId = await syncWithDynamic({ ...rule, config })
      syncing.current.delete(id)
      // Persist Dynamic rule ID back to Supabase config
      if (returnedId && !config.dynamic_rule_id) {
        await updateConfig(id, { ...config, dynamic_rule_id: returnedId })
      }
    }
  }

  const handleDelete = async (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (rule) deleteFromDynamic(rule)
    await deleteRule(id)
  }

  const handleAddRule = async (type: string, defaultConfig: Record<string, unknown>) => {
    if (!user?.id) return
    setShowAddModal(false)
    await addRule(type, defaultConfig, user.id)
  }

  const isLoading = userLoading || rulesLoading

  return (
    <DashboardLayout title="Rules">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-foreground">Your security policy</h2>
            {!user && !userLoading && (
              <p className="text-xs text-vanta-text-muted mt-0.5">Connect your wallet to manage rules</p>
            )}
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            disabled={!user}
            variant="outline"
            className="border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg disabled:opacity-40"
          >
            <Plus size={16} className="mr-2" />
            Add rule
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-vanta-teal" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-vanta-text-muted">
            <ShieldOff size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No rules yet. Add one to start protecting your wallet.</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={rules}
            onReorder={() => {}}
            className="space-y-3"
          >
            {rules.map((rule) => (
              <Reorder.Item key={rule.id} value={rule}>
                <RuleCard
                  rule={rule}
                  onToggle={handleToggle}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddRuleModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddRule}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
