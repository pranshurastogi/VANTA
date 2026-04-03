"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bot, 
  Plus, 
  MoreVertical, 
  Check, 
  X,
  ChevronDown
} from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { mockAgents } from "@/lib/mock-data"
import { Agent } from "@/lib/types"

function PulsingDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
    </span>
  )
}

interface AgentCardProps {
  agent: Agent
  onToggle: (id: string) => void
}

function AgentCard({ agent, onToggle }: AgentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-vanta-surface border border-border rounded-xl p-5"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          agent.active ? "bg-vanta-teal/10" : "bg-vanta-elevated"
        )}>
          <Bot size={24} className={agent.active ? "text-vanta-teal" : "text-vanta-text-muted"} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm text-foreground">{agent.name}</h3>
            {agent.active && <PulsingDot />}
          </div>
          {agent.ens && (
            <p className="font-mono text-xs text-vanta-text-muted mb-2 truncate">
              {agent.ens}
            </p>
          )}
          <p className="text-xs text-vanta-text-secondary">
            {agent.txnsToday} txns today · ${agent.volumeToday.toLocaleString()} volume · {agent.blocked} blocked
          </p>
          
          {/* Permissions */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.permissions.map((perm) => (
              <span
                key={perm.name}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px]",
                  perm.allowed
                    ? "bg-vanta-teal/10 text-vanta-teal"
                    : "bg-vanta-red/10 text-vanta-red"
                )}
              >
                {perm.name} {perm.allowed ? "✓" : "✗"}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
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
              <DropdownMenuItem className="text-vanta-text-secondary hover:text-foreground">
                Edit permissions
              </DropdownMenuItem>
              <DropdownMenuItem className="text-vanta-text-secondary hover:text-foreground">
                View logs
              </DropdownMenuItem>
              <DropdownMenuItem className="text-vanta-red hover:text-vanta-red">
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}

const defaultPermissions = [
  { id: "read", label: "Read balance and history", defaultChecked: true },
  { id: "swap", label: "Execute swaps on whitelisted DEXes", defaultChecked: true },
  { id: "transfer", label: "Transfer to whitelisted addresses", defaultChecked: true },
  { id: "approve", label: "Approve token spending", defaultChecked: false },
  { id: "deploy", label: "Deploy contracts", defaultChecked: false },
  { id: "modify", label: "Modify rules (never auto-granted)", defaultChecked: false },
]

function ConnectAgentFlow({ onConnect, onCancel }: { onConnect: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [mcpUrl, setMcpUrl] = useState("")
  const [ensName, setEnsName] = useState("")
  const [permissions, setPermissions] = useState(
    defaultPermissions.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultChecked }), {} as Record<string, boolean>)
  )

  const handlePermissionChange = (id: string, checked: boolean) => {
    setPermissions(prev => ({ ...prev, [id]: checked }))
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-vanta-surface border border-border rounded-xl p-6 mt-4">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step >= s 
                  ? "bg-vanta-teal text-vanta-bg" 
                  : "bg-vanta-elevated text-vanta-text-muted"
              )}>
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-8 h-0.5",
                  step > s ? "bg-vanta-teal" : "bg-vanta-elevated"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: MCP URL */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-sm text-foreground">Paste your MCP server URL</h3>
            <Input
              placeholder="https://mcp.example.com/agent"
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-border text-vanta-text-secondary hover:bg-vanta-elevated"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!mcpUrl}
                className="flex-1 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Permissions */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-sm text-foreground">Set agent permissions</h3>
            <div className="space-y-3">
              {defaultPermissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <Checkbox
                    checked={permissions[perm.id]}
                    onCheckedChange={(checked) => handlePermissionChange(perm.id, !!checked)}
                    className="border-border data-[state=checked]:bg-vanta-teal data-[state=checked]:border-vanta-teal"
                  />
                  <span className="text-sm text-vanta-text-secondary group-hover:text-foreground transition-colors">
                    {perm.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 border-border text-vanta-text-secondary hover:bg-vanta-elevated"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90"
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: ENS Name */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-sm text-foreground">Assign ENS subname (optional)</h3>
            <div className="flex items-center">
              <Input
                placeholder="myagent"
                value={ensName}
                onChange={(e) => setEnsName(e.target.value)}
                className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted rounded-r-none"
              />
              <span className="px-3 py-2 bg-vanta-elevated border border-l-0 border-border-hover rounded-r-lg text-vanta-text-muted text-sm">
                .vanta.pranshu.eth
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 border-border text-vanta-text-secondary hover:bg-vanta-elevated"
              >
                Back
              </Button>
              <Button
                onClick={onConnect}
                className="flex-1 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90"
              >
                Connect
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [showConnectFlow, setShowConnectFlow] = useState(false)

  const handleToggle = (id: string) => {
    setAgents(agents.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  const handleConnect = () => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: "New Agent",
      ens: "newagent.vanta.pranshu.eth",
      active: true,
      txnsToday: 0,
      volumeToday: 0,
      blocked: 0,
      permissions: [
        { name: "Swap", allowed: true },
        { name: "Transfer", allowed: true },
        { name: "Approve", allowed: false },
        { name: "Deploy", allowed: false },
      ]
    }
    setAgents([...agents, newAgent])
    setShowConnectFlow(false)
  }

  return (
    <DashboardLayout title="Agents">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-foreground">Connected agents</h2>
          <Button
            onClick={() => setShowConnectFlow(!showConnectFlow)}
            variant="outline"
            className="border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg"
          >
            <Plus size={16} className="mr-2" />
            Connect new agent
          </Button>
        </div>

        {/* Connect Flow */}
        <AnimatePresence>
          {showConnectFlow && (
            <ConnectAgentFlow
              onConnect={handleConnect}
              onCancel={() => setShowConnectFlow(false)}
            />
          )}
        </AnimatePresence>

        {/* Agent Cards */}
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

        {agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Bot size={48} className="mx-auto text-vanta-text-muted mb-4" />
            <h3 className="text-foreground mb-2">No agents connected</h3>
            <p className="text-sm text-vanta-text-muted">
              Connect your first AI agent to get started
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
