"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Wallet, AlertTriangle } from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/vanta/status-badge"
import { cn } from "@/lib/utils"

type ConfirmationMethod = "passkey" | "worldid" | "ledger" | "manual"

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
  danger?: boolean
}

function SettingsSection({ title, children, danger }: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-vanta-surface border border-border rounded-xl overflow-hidden",
        danger && "border-vanta-red/30 bg-[#1A1010]"
      )}
    >
      <div className="px-6 py-4 border-b border-border">
        <h3 className={cn(
          "text-sm font-medium",
          danger ? "text-vanta-red" : "text-foreground"
        )}>
          {title}
        </h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-vanta-text-muted mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function RadioOption({ 
  value, 
  selected, 
  label, 
  description, 
  recommended,
  onSelect 
}: { 
  value: string
  selected: boolean
  label: string
  description?: string
  recommended?: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 w-full text-left p-3 rounded-lg border transition-colors",
        selected 
          ? "border-vanta-teal bg-vanta-teal/5" 
          : "border-border hover:border-border-hover"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5",
        selected ? "border-vanta-teal" : "border-vanta-text-muted"
      )}>
        {selected && <div className="w-2 h-2 rounded-full bg-vanta-teal" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{label}</span>
          {recommended && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-vanta-teal/10 text-vanta-teal">
              recommended
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-vanta-text-muted mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}

export default function SettingsPage() {
  const [confirmationMethod, setConfirmationMethod] = useState<ConfirmationMethod>("passkey")
  const [tier3Escalation, setTier3Escalation] = useState("passkey-15")
  const [notifications, setNotifications] = useState({
    pushTier2: true,
    emailBlocked: true,
    dailyDigest: false,
    disconnection: true,
  })

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Identity Section */}
        <SettingsSection title="Identity">
          <div className="space-y-4">
            <SettingsRow label="World ID">
              <div className="flex items-center gap-3">
                <StatusBadge variant="safe">Verified</StatusBadge>
                <button className="text-xs text-vanta-text-muted hover:text-foreground transition-colors">
                  Re-verify
                </button>
              </div>
            </SettingsRow>
            <div className="text-xs text-vanta-text-muted">
              Last verified: March 28, 2026
            </div>

            <div className="h-px bg-border my-4" />

            <SettingsRow label="ENS Name">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-foreground">vanta.pranshu.eth</span>
                <button className="text-xs text-vanta-text-muted hover:text-foreground transition-colors">
                  Change
                </button>
              </div>
            </SettingsRow>

            <div className="h-px bg-border my-4" />

            <SettingsRow label="Wallet">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-vanta-teal pulse-dot" />
                  <span className="font-mono text-sm text-foreground">0x1a2b...9f3e</span>
                </div>
                <span className="text-xs text-vanta-text-muted">Ethereum Mainnet</span>
              </div>
            </SettingsRow>
          </div>
        </SettingsSection>

        {/* Confirmation Methods Section */}
        <SettingsSection title="Confirmation methods">
          <div className="space-y-4">
            <h4 className="text-xs text-vanta-text-secondary mb-3">Default confirmation method</h4>
            <div className="space-y-2">
              <RadioOption
                value="passkey"
                selected={confirmationMethod === "passkey"}
                label="Passkey (Face ID / Touch ID)"
                recommended
                onSelect={() => setConfirmationMethod("passkey")}
              />
              <RadioOption
                value="worldid"
                selected={confirmationMethod === "worldid"}
                label="World ID re-verification"
                onSelect={() => setConfirmationMethod("worldid")}
              />
              <RadioOption
                value="ledger"
                selected={confirmationMethod === "ledger"}
                label="Hardware wallet (Ledger)"
                onSelect={() => setConfirmationMethod("ledger")}
              />
              <RadioOption
                value="manual"
                selected={confirmationMethod === "manual"}
                label="Manual approval (type to confirm)"
                onSelect={() => setConfirmationMethod("manual")}
              />
            </div>

            <div className="h-px bg-border my-6" />

            <h4 className="text-xs text-vanta-text-secondary mb-3">Tier 3 escalation</h4>
            <select
              value={tier3Escalation}
              onChange={(e) => setTier3Escalation(e.target.value)}
              className="w-full bg-vanta-elevated border border-border-hover text-foreground rounded-lg px-3 py-2 text-sm"
            >
              <option value="passkey-15">Passkey + 15 min delay</option>
              <option value="worldid-24">World ID + 24h delay</option>
              <option value="ledger-24">Ledger + 24h delay</option>
            </select>
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <div className="space-y-1">
            <SettingsRow 
              label="Push notifications for Tier 2 confirmations"
            >
              <Switch
                checked={notifications.pushTier2}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushTier2: checked }))}
                className="data-[state=checked]:bg-vanta-teal"
              />
            </SettingsRow>
            <SettingsRow 
              label="Email alerts for blocked transactions"
            >
              <Switch
                checked={notifications.emailBlocked}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailBlocked: checked }))}
                className="data-[state=checked]:bg-vanta-teal"
              />
            </SettingsRow>
            <SettingsRow 
              label="Daily security digest"
            >
              <Switch
                checked={notifications.dailyDigest}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, dailyDigest: checked }))}
                className="data-[state=checked]:bg-vanta-teal"
              />
            </SettingsRow>
            <SettingsRow 
              label="Agent disconnection alerts"
            >
              <Switch
                checked={notifications.disconnection}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, disconnection: checked }))}
                className="data-[state=checked]:bg-vanta-teal"
              />
            </SettingsRow>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger zone" danger>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm text-foreground">Pause daemon</h4>
                <p className="text-xs text-vanta-text-muted mt-0.5">
                  Temporarily disable all security checks
                </p>
              </div>
              <Button
                variant="outline"
                className="border-vanta-amber text-vanta-amber hover:bg-vanta-amber/10"
              >
                <AlertTriangle size={14} className="mr-2" />
                Pause
              </Button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm text-foreground">Disconnect all agents</h4>
                <p className="text-xs text-vanta-text-muted mt-0.5">
                  Remove all connected AI agents
                </p>
              </div>
              <Button
                variant="outline"
                className="border-vanta-red text-vanta-red hover:bg-vanta-red/10"
              >
                Disconnect all
              </Button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm text-foreground">Reset all rules to defaults</h4>
                <p className="text-xs text-vanta-text-muted mt-0.5">
                  This will delete all custom rules
                </p>
              </div>
              <button className="text-sm text-vanta-red hover:underline">
                Reset rules
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </DashboardLayout>
  )
}
