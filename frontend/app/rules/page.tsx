"use client"

import { useState } from "react"
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
  FileText,
  Zap
} from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RuleConfig {
  limit?: number
  addresses?: { address: string; label: string }[]
  contracts?: { name: string; enabled: boolean }[]
  from?: string
  to?: string
  timezone?: string
}

interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  type: "limit" | "whitelist" | "block" | "time" | "custom"
  config?: RuleConfig
}

const initialRules: Rule[] = [
  {
    id: "1",
    name: "Daily spending limit",
    description: "Auto-approve transactions under this amount per day",
    enabled: true,
    type: "limit",
    config: { limit: 500 }
  },
  {
    id: "2",
    name: "Per-transaction limit",
    description: "Require confirmation for any single transaction above this amount",
    enabled: true,
    type: "limit",
    config: { limit: 200 }
  },
  {
    id: "3",
    name: "Trusted addresses",
    description: "Auto-approve transactions to these addresses",
    enabled: true,
    type: "whitelist",
    config: { 
      addresses: [
        { address: "0x8f2a...3b1c", label: "My Ledger" },
        { address: "0x4d5e...7a8b", label: "Coinbase" },
        { address: "0x2c3d...1e2f", label: "Family wallet" },
      ] 
    }
  },
  {
    id: "4",
    name: "Approved contracts",
    description: "Allow interactions with verified DeFi protocols",
    enabled: true,
    type: "whitelist",
    config: {
      contracts: [
        { name: "Uniswap V3", enabled: true },
        { name: "Aave V3", enabled: true },
        { name: "Compound", enabled: true },
        { name: "1inch", enabled: true },
        { name: "Lido", enabled: false },
        { name: "Curve", enabled: false },
      ]
    }
  },
  {
    id: "5",
    name: "Block unlimited token approvals",
    description: "Hard-block any ERC-20 approve() with max uint256",
    enabled: true,
    type: "block",
  },
  {
    id: "6",
    name: "Strip personal data from calldata",
    description: "Remove names, emails, invoice numbers before broadcast",
    enabled: true,
    type: "custom",
  },
  {
    id: "7",
    name: "Quiet hours",
    description: "Require manual confirmation during these hours regardless of amount",
    enabled: false,
    type: "time",
    config: { from: "02:00", to: "06:00", timezone: "UTC" }
  },
]

const quickSetAmounts = [100, 250, 500, 1000, 2500]

interface RuleCardProps {
  rule: Rule
  onToggle: (id: string) => void
  onUpdate: (id: string, config: RuleConfig) => void
  onDelete: (id: string) => void
}

function RuleCard({ rule, onToggle, onUpdate, onDelete }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const renderEditView = () => {
    switch (rule.type) {
      case "limit":
        return (
          <div className="pt-4 space-y-4">
            <Slider
              value={[rule.config?.limit || 0]}
              min={0}
              max={rule.id === "1" ? 5000 : 10000}
              step={50}
              onValueChange={([value]) => onUpdate(rule.id, { ...rule.config, limit: value })}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-vanta-teal [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&>span:first-child]:bg-vanta-elevated [&>span:first-child>span]:bg-vanta-teal"
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg text-foreground">
                ${rule.config?.limit?.toLocaleString()}
              </span>
              <div className="flex gap-2">
                {quickSetAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => onUpdate(rule.id, { ...rule.config, limit: amount })}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs transition-colors",
                      rule.config?.limit === amount
                        ? "bg-vanta-teal/10 text-vanta-teal"
                        : "bg-vanta-elevated text-vanta-text-muted hover:text-foreground"
                    )}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case "whitelist":
        if (rule.config?.addresses) {
          return (
            <div className="pt-4 space-y-3">
              {rule.config.addresses.map((addr, index) => (
                <div key={index} className="flex items-center gap-3 bg-vanta-elevated rounded-lg px-3 py-2">
                  <span className="font-mono text-[13px] text-foreground">{addr.address}</span>
                  <span className="text-xs text-vanta-text-muted">{addr.label}</span>
                  <button 
                    onClick={() => {
                      const newAddresses = rule.config?.addresses?.filter((_, i) => i !== index)
                      onUpdate(rule.id, { ...rule.config, addresses: newAddresses })
                    }}
                    className="ml-auto text-vanta-text-muted hover:text-vanta-red transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter address or ENS name" 
                  className="flex-1 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted"
                />
                <Button 
                  variant="outline" 
                  className="border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg"
                >
                  Add
                </Button>
              </div>
            </div>
          )
        }
        if (rule.config?.contracts) {
          return (
            <div className="pt-4">
              <div className="flex flex-wrap gap-2">
                {rule.config.contracts.map((contract, index) => (
                  <button
                    key={contract.name}
                    onClick={() => {
                      const newContracts = rule.config?.contracts?.map((c, i) => 
                        i === index ? { ...c, enabled: !c.enabled } : c
                      )
                      onUpdate(rule.id, { ...rule.config, contracts: newContracts })
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs transition-colors",
                      contract.enabled
                        ? "bg-vanta-teal/10 text-vanta-teal"
                        : "bg-vanta-elevated text-vanta-text-muted hover:text-foreground"
                    )}
                  >
                    {contract.name} {contract.enabled && "✓"}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        return null

      case "time":
        return (
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-vanta-text-muted mb-1 block">From</label>
                <Input 
                  type="time" 
                  value={rule.config?.from || "02:00"}
                  onChange={(e) => onUpdate(rule.id, { ...rule.config, from: e.target.value })}
                  className="bg-vanta-elevated border-border-hover text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-vanta-text-muted mb-1 block">To</label>
                <Input 
                  type="time" 
                  value={rule.config?.to || "06:00"}
                  onChange={(e) => onUpdate(rule.id, { ...rule.config, to: e.target.value })}
                  className="bg-vanta-elevated border-border-hover text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-vanta-text-muted mb-1 block">Timezone</label>
              <select 
                value={rule.config?.timezone || "UTC"}
                onChange={(e) => onUpdate(rule.id, { ...rule.config, timezone: e.target.value })}
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

  const hasEditView = rule.type === "limit" || rule.type === "whitelist" || rule.type === "time"

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
          onCheckedChange={() => onToggle(rule.id)}
          className="data-[state=checked]:bg-vanta-teal"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-foreground">{rule.name}</h3>
          <p className="text-xs text-vanta-text-muted truncate">{rule.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasEditView && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-vanta-text-secondary hover:text-foreground transition-colors flex items-center gap-1"
            >
              Edit
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const ruleTemplates = [
  { id: "spending", name: "Spending limit", icon: DollarSign },
  { id: "address", name: "Address whitelist", icon: Users },
  { id: "contract", name: "Contract filter", icon: FileCode },
  { id: "time", name: "Time restriction", icon: Clock },
  { id: "block", name: "Block pattern", icon: ShieldOff },
  { id: "custom", name: "Custom", icon: Zap },
]

interface AddRuleModalProps {
  onClose: () => void
  onAdd: (template: string) => void
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-vanta-text-muted hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="font-mono text-lg text-foreground mb-6">Add rule</h2>

        <div className="grid grid-cols-2 gap-3">
          {ruleTemplates.map((template) => {
            const Icon = template.icon
            return (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAdd(template.id)}
                className="flex flex-col items-center gap-3 p-4 bg-vanta-elevated border border-border rounded-xl hover:border-vanta-teal/50 transition-colors"
              >
                <Icon size={24} className="text-vanta-text-secondary" />
                <span className="text-xs text-foreground">{template.name}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleToggle = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const handleUpdate = (id: string, config: RuleConfig) => {
    setRules(rules.map(r => r.id === id ? { ...r, config } : r))
  }

  const handleDelete = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
  }

  const handleAddRule = (template: string) => {
    const newRule: Rule = {
      id: Date.now().toString(),
      name: `New ${template} rule`,
      description: "Configure this rule",
      enabled: true,
      type: template === "spending" ? "limit" : template === "address" ? "whitelist" : template === "contract" ? "whitelist" : template === "time" ? "time" : template === "block" ? "block" : "custom",
      config: template === "spending" ? { limit: 500 } : undefined
    }
    setRules([...rules, newRule])
    setShowAddModal(false)
  }

  return (
    <DashboardLayout title="Rules">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-foreground">Your security policy</h2>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg"
          >
            <Plus size={16} className="mr-2" />
            Add rule
          </Button>
        </div>

        {/* Rules List */}
        <Reorder.Group
          axis="y"
          values={rules}
          onReorder={setRules}
          className="space-y-3"
        >
          {rules.map((rule) => (
            <Reorder.Item key={rule.id} value={rule}>
              <RuleCard
                rule={rule}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Add Rule Modal */}
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
