"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  AlertTriangle,
  Loader2,
  Fingerprint,
  Mail,
  ShieldCheck,
  Key,
} from "lucide-react"
import { useDynamic } from "@/lib/dynamic/context"
import { useUser, type ConfirmationMethod } from "@/hooks/useUser"
import { usePasskey } from "@/hooks/usePasskey"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/vanta/status-badge"
import { cn } from "@/lib/utils"
import { WorldIdGate } from "@/components/vanta/world-id-gate"
import { useWorldId } from "@/hooks/useWorldId"

// ─── Shared UI ────────────────────────────────────────────

function SettingsSection({
  title,
  children,
  danger,
}: {
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
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
        <h3
          className={cn(
            "text-sm font-medium",
            danger ? "text-vanta-red" : "text-foreground"
          )}
        >
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
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
  selected,
  label,
  description,
  recommended,
  disabled,
  badge,
  onSelect,
}: {
  selected: boolean
  label: string
  description?: string
  recommended?: boolean
  disabled?: boolean
  badge?: React.ReactNode
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex items-start gap-3 w-full text-left p-3 rounded-lg border transition-colors",
        selected
          ? "border-vanta-teal bg-vanta-teal/5"
          : "border-border hover:border-border-hover",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5",
          selected ? "border-vanta-teal" : "border-vanta-text-muted"
        )}
      >
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
          {badge}
        </div>
        {description && (
          <p className="text-xs text-vanta-text-muted mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { wallet, disconnect } = useDynamic()
  const { user, updateSettings } = useUser()
  const {
    passkeys,
    registered: passkeyRegistered,
    loading: passkeyLoading,
    supported: passkeySupported,
    error: passkeyError,
    register: registerPasskey,
  } = usePasskey()
  const address = wallet?.address
  const { verified: worldIdVerified } = useWorldId(address)
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "—"

  // Local state synced from user
  const [confirmationMethod, setConfirmationMethod] =
    useState<ConfirmationMethod>("passkey")
  const [tier3Escalation, setTier3Escalation] = useState("passkey-15")
  const [email, setEmail] = useState("")
  const [emailSaved, setEmailSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passkeyRegistering, setPasskeyRegistering] = useState(false)

  // Load user settings
  useEffect(() => {
    if (!user) return
    setConfirmationMethod(user.confirmation_method ?? "passkey")
    setTier3Escalation(user.tier3_escalation ?? "passkey-15")
    setEmail(user.email ?? "")
  }, [user])

  const handleConfirmationChange = async (method: ConfirmationMethod) => {
    setConfirmationMethod(method)
    setSaving(true)
    await updateSettings({ confirmation_method: method })
    setSaving(false)
  }

  const handleTier3Change = async (value: string) => {
    setTier3Escalation(value)
    setSaving(true)
    await updateSettings({ tier3_escalation: value })
    setSaving(false)
  }

  const handleEmailSave = async () => {
    setSaving(true)
    await updateSettings({ email: email || null })
    setSaving(false)
    setEmailSaved(true)
    setTimeout(() => setEmailSaved(false), 2000)
  }

  const [passkeySuccess, setPasskeySuccess] = useState(false)

  const handleRegisterPasskey = async () => {
    setPasskeyRegistering(true)
    setPasskeySuccess(false)
    const ok = await registerPasskey()
    setPasskeyRegistering(false)
    if (ok) {
      setPasskeySuccess(true)
      setTimeout(() => setPasskeySuccess(false), 3000)
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* ── Identity ── */}
        <SettingsSection title="Identity & Wallet">
          <div className="space-y-4">
            <SettingsRow label="Wallet">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      address ? "bg-vanta-teal pulse-dot" : "bg-vanta-text-muted"
                    }`}
                  />
                  <span className="font-mono text-sm text-foreground">
                    {shortAddress}
                  </span>
                </div>
                <StatusBadge variant="safe">Sepolia</StatusBadge>
                {address && (
                  <button
                    onClick={disconnect}
                    className="text-xs text-vanta-text-muted hover:text-vanta-red transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </SettingsRow>

          </div>
        </SettingsSection>

        {/* ── World ID Verification ── */}
        <SettingsSection title="World ID — Proof of Human">
          <WorldIdGate address={address} />
        </SettingsSection>

        {/* ── Passkey Setup ── */}
        <SettingsSection title="Passkey / Biometric">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={passkeyRegistered ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300",
                  passkeyRegistered ? "bg-vanta-teal/10" : "bg-vanta-elevated"
                )}
              >
                <Fingerprint
                  size={22}
                  className={cn(
                    "transition-colors duration-300",
                    passkeyRegistered ? "text-vanta-teal" : "text-vanta-text-muted"
                  )}
                />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {passkeyRegistered
                      ? "Passkey registered"
                      : "No passkey registered"}
                  </span>
                  <AnimatePresence>
                    {passkeyRegistered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <StatusBadge variant="safe">Active</StatusBadge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-xs text-vanta-text-muted mt-0.5">
                  {passkeyRegistered
                    ? `${passkeys.length} passkey${passkeys.length > 1 ? "s" : ""} registered — used for Face ID / Touch ID confirmation`
                    : "Register a passkey to enable biometric confirmation for transactions"}
                </p>
              </div>
              <Button
                onClick={handleRegisterPasskey}
                disabled={passkeyLoading || passkeyRegistering || !passkeySupported || !address}
                variant="outline"
                className={cn(
                  "border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg transition-all",
                  passkeyRegistered && "border-border text-vanta-text-secondary hover:border-vanta-teal"
                )}
              >
                {passkeyRegistering ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <Key size={14} className="mr-2" />
                )}
                {passkeyRegistered ? "Add another" : "Register passkey"}
              </Button>
            </div>

            {/* Status messages */}
            <AnimatePresence mode="wait">
              {!address && (
                <motion.p
                  key="no-wallet"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-vanta-amber flex items-center gap-1.5"
                >
                  <AlertTriangle size={12} />
                  Connect your wallet first to register a passkey
                </motion.p>
              )}
              {!passkeySupported && address && (
                <motion.p
                  key="unsupported"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-vanta-amber flex items-center gap-1.5"
                >
                  <AlertTriangle size={12} />
                  WebAuthn is not supported in this browser. Use Chrome, Safari, or Edge on a device with biometrics.
                </motion.p>
              )}
              {passkeyError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-xs text-vanta-red"
                >
                  {passkeyError}
                </motion.div>
              )}
              {passkeySuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 bg-vanta-teal/10 border border-vanta-teal/20 rounded-lg text-xs text-vanta-teal flex items-center gap-2"
                >
                  <Check size={14} />
                  Passkey registered successfully! You can now use Face ID / Touch ID to confirm transactions.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Registered passkey list */}
            <AnimatePresence>
              {passkeys.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {passkeys.map((pk, i) => (
                    <motion.div
                      key={pk.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
                    >
                      <ShieldCheck size={14} className="text-vanta-teal shrink-0" />
                      <span className="font-mono text-xs text-foreground flex-1">
                        {pk.alias || `Passkey ${i + 1}`}
                      </span>
                      {pk.createdAt && (
                        <span className="text-[10px] text-vanta-text-muted">
                          {new Date(pk.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SettingsSection>

        {/* ── Email Notifications ── */}
        <SettingsSection title="Email Notifications">
          <div className="space-y-4">
            <p className="text-xs text-vanta-text-muted">
              Get notified by email when an agent submits a Tier 2 or Tier 3
              transaction. The email includes a link back to your dashboard.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-vanta-text-muted"
                />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailSaved(false)
                  }}
                  className="pl-10 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted"
                />
              </div>
              <Button
                onClick={handleEmailSave}
                disabled={saving || !email}
                className="bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 min-w-[80px]"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : emailSaved ? (
                  <>
                    <Check size={14} className="mr-1" /> Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
            {user?.email && (
              <p className="text-[11px] text-vanta-text-muted flex items-center gap-1">
                <Check size={12} className="text-vanta-teal" />
                Notifications will be sent to{" "}
                <span className="text-foreground">{user.email}</span>
              </p>
            )}
          </div>
        </SettingsSection>

        {/* ── Confirmation Methods ── */}
        <SettingsSection title="Confirmation method">
          <div className="space-y-4">
            <p className="text-xs text-vanta-text-muted mb-2">
              How you verify Tier 2 transactions before they are signed
            </p>
            <div className="space-y-2">
              <RadioOption
                selected={confirmationMethod === "passkey"}
                label="Passkey (Face ID / Touch ID)"
                description="Biometric verification via WebAuthn — fastest and most secure"
                recommended
                badge={
                  passkeyRegistered ? (
                    <StatusBadge variant="safe">Ready</StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">Not set up</StatusBadge>
                  )
                }
                onSelect={() => handleConfirmationChange("passkey")}
              />
              <RadioOption
                selected={confirmationMethod === "worldid"}
                label="World ID (Proof of Human)"
                description="Cryptographic proof of unique human — strongest Sybil resistance"
                badge={
                  worldIdVerified ? (
                    <StatusBadge variant="safe">Verified</StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">Not verified</StatusBadge>
                  )
                }
                onSelect={() => handleConfirmationChange("worldid")}
              />
              <RadioOption
                selected={confirmationMethod === "ledger"}
                label="Hardware wallet (Ledger)"
                description="Sign confirmation on your Ledger device"
                onSelect={() => handleConfirmationChange("ledger")}
              />
              <RadioOption
                selected={confirmationMethod === "manual"}
                label="Manual approval"
                description='Type "CONFIRM" in the dashboard — lowest security, no hardware needed'
                onSelect={() => handleConfirmationChange("manual")}
              />
              {saving && (
                <div className="flex items-center gap-2 text-xs text-vanta-text-muted">
                  <Loader2 size={12} className="animate-spin" />
                  Saving...
                </div>
              )}
            </div>

            <div className="h-px bg-border my-6" />

            <h4 className="text-xs text-vanta-text-secondary mb-3">
              Tier 3 escalation
            </h4>
            <p className="text-xs text-vanta-text-muted mb-2">
              Tier 3 transactions are blocked by default. Choose what it takes to
              override the block.
            </p>
            <select
              value={tier3Escalation}
              onChange={(e) => handleTier3Change(e.target.value)}
              className="w-full bg-vanta-elevated border border-border-hover text-foreground rounded-lg px-3 py-2 text-sm"
            >
              <option value="passkey-15">Passkey + 15 min delay</option>
              <option value="worldid-24">World ID + 24h delay</option>
              <option value="ledger-24">Ledger + 24h delay</option>
            </select>
          </div>
        </SettingsSection>

        {/* ── Danger Zone ── */}
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
                <h4 className="text-sm text-foreground">
                  Disconnect all agents
                </h4>
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
          </div>
        </SettingsSection>
      </div>
    </DashboardLayout>
  )
}
