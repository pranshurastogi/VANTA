"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  AlertTriangle,
  Fingerprint,
  Mail,
  ShieldCheck,
  Key,
  Globe,
  Usb,
  ChevronDown,
  ArrowRight,
  Type,
} from "lucide-react"
import { InfinityLoader } from "@/components/ui/loader-13"
import { useDynamic } from "@/lib/dynamic/context"
import { useUser, type ConfirmationMethod } from "@/hooks/useUser"
import { usePasskey } from "@/hooks/usePasskey"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/vanta/status-badge"
import { cn } from "@/lib/utils"
import { WorldIdGate } from "@/components/vanta/world-id-gate"
import { LedgerGate } from "@/components/vanta/ledger-gate"
import { useWorldId } from "@/hooks/useWorldId"

// ── Collapsible section wrapper ──────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = false,
  danger,
  children,
}: {
  title: string
  defaultOpen?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        danger ? "border-red-500/30 bg-[#1A1010]" : "border-border bg-vanta-surface"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className={cn("text-sm font-medium", danger ? "text-red-400" : "text-foreground")}>
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Security method card (card-21 inspired) ──────────────────────────────────

function SecurityMethodCard({
  icon: Icon,
  title,
  subtitle,
  statusLabel,
  statusOk,
  themeHsl,
  defaultExpanded = false,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  statusLabel: string
  statusOk: boolean
  themeHsl: string
  defaultExpanded?: boolean
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/8"
      style={{ "--theme-color": themeHsl } as React.CSSProperties}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 30% 0%, hsl(${themeHsl} / 0.18), transparent 70%), #0D0D0D`,
        }}
      />
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(${themeHsl} / 0.25) 0.6px, transparent 1px)`,
          backgroundSize: "14px 14px",
        }}
      />

      {/* Header */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `hsl(${themeHsl} / 0.15)`, border: `1px solid hsl(${themeHsl} / 0.3)` }}
          >
            <Icon size={18} style={{ color: `hsl(${themeHsl})` }} />
          </div>
          <span
            className="text-[10px] font-medium px-2 py-1 rounded-full"
            style={{
              background: statusOk ? `hsl(${themeHsl} / 0.12)` : "rgba(255,255,255,0.05)",
              color: statusOk ? `hsl(${themeHsl})` : "#888",
              border: `1px solid ${statusOk ? `hsl(${themeHsl} / 0.3)` : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed flex-1">{subtitle}</p>

        {/* CTA button (card-21 style) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-5 flex items-center justify-between w-full rounded-lg px-4 py-2.5 text-xs font-medium transition-all duration-300"
          style={{
            background: `hsl(${themeHsl} / 0.12)`,
            border: `1px solid hsl(${themeHsl} / 0.25)`,
            color: `hsl(${themeHsl})`,
          }}
        >
          <span>{expanded ? "Collapse" : statusOk ? "Manage" : "Set up"}</span>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ArrowRight size={13} />
          </motion.div>
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 py-5 border-t"
              style={{ borderColor: `hsl(${themeHsl} / 0.2)` }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Confirmation method row ──────────────────────────────────────────────────

function ConfirmMethodRow({
  icon: Icon,
  method,
  title,
  description,
  recommended,
  badge,
  selected,
  onSelect,
  children,
}: {
  icon: React.ElementType
  method: ConfirmationMethod
  title: string
  description: string
  recommended?: boolean
  badge?: React.ReactNode
  selected: boolean
  onSelect: () => void
  children?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors overflow-hidden",
        selected ? "border-[#00FFB2]/50 bg-[#00FFB2]/[0.04]" : "border-border hover:border-white/20"
      )}
    >
      <button
        onClick={() => { onSelect(); setExpanded(!expanded) }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Radio dot */}
        <div
          className={cn(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            selected ? "border-[#00FFB2]" : "border-muted-foreground/40"
          )}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#00FFB2]" />}
        </div>

        {/* Icon */}
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          selected ? "bg-[#00FFB2]/10" : "bg-muted/50"
        )}>
          <Icon size={13} className={selected ? "text-[#00FFB2]" : "text-muted-foreground"} />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-foreground">{title}</span>
            {recommended && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00FFB2]/10 text-[#00FFB2] uppercase tracking-wide">
                recommended
              </span>
            )}
            {badge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>

        {/* Chevron for expandable */}
        {children && (
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronDown size={13} className="text-muted-foreground shrink-0" />
          </motion.div>
        )}
      </button>

      {/* Expanded inline content */}
      <AnimatePresence initial={false}>
        {expanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

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
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"

  const [confirmationMethod, setConfirmationMethod] = useState<ConfirmationMethod>("passkey")
  const [tier3Escalation, setTier3Escalation] = useState("passkey-15")
  const [email, setEmail] = useState("")
  const [emailSaved, setEmailSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passkeyRegistering, setPasskeyRegistering] = useState(false)
  const [passkeySuccess, setPasskeySuccess] = useState(false)

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
      <div className="space-y-4 max-w-3xl">

        {/* ── Identity ── */}
        <CollapsibleSection title="Identity & Wallet" defaultOpen>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Connected wallet</p>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", address ? "bg-[#00FFB2] pulse-dot" : "bg-muted-foreground")} />
                <span className="font-mono text-sm text-foreground">{shortAddress}</span>
                <StatusBadge variant="safe">Sepolia</StatusBadge>
              </div>
            </div>
            {address && (
              <button
                onClick={disconnect}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* ── Security Methods — card-21 style grid ── */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 px-1">Verification methods</p>
          <div className="grid gap-3 sm:grid-cols-3">

            {/* Passkey */}
            <SecurityMethodCard
              icon={Fingerprint}
              title="Passkey"
              subtitle="Biometric via WebAuthn. Fastest and most secure — Face ID or Touch ID."
              statusLabel={passkeyRegistered ? "Ready" : "Not set up"}
              statusOk={passkeyRegistered}
              themeHsl="158 100% 50%"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Fingerprint size={14} className={passkeyRegistered ? "text-[#00FFB2]" : "text-muted-foreground"} />
                  <span className="text-xs text-foreground">
                    {passkeyRegistered
                      ? `${passkeys.length} passkey${passkeys.length !== 1 ? "s" : ""} registered`
                      : "No passkey registered"}
                  </span>
                </div>
                <Button
                  onClick={handleRegisterPasskey}
                  disabled={passkeyLoading || passkeyRegistering || !passkeySupported || !address}
                  size="sm"
                  className="w-full border border-[#00FFB2]/40 bg-transparent text-[#00FFB2] hover:bg-[#00FFB2]/10 h-8 text-xs"
                >
                  {passkeyRegistering ? <InfinityLoader size={12} className="mr-1.5" /> : <Key size={12} className="mr-1.5" />}
                  {passkeyRegistered ? "Add another" : "Register passkey"}
                </Button>

                <AnimatePresence mode="wait">
                  {!address && (
                    <motion.p key="nw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> Connect wallet first
                    </motion.p>
                  )}
                  {passkeyError && (
                    <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-red-400">{passkeyError}</motion.p>
                  )}
                  {passkeySuccess && (
                    <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-[#00FFB2] flex items-center gap-1">
                      <Check size={10} /> Passkey registered
                    </motion.p>
                  )}
                </AnimatePresence>

                {passkeys.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {passkeys.map((pk, i) => (
                      <div key={pk.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <ShieldCheck size={11} className="text-[#00FFB2] shrink-0" />
                        <span className="font-mono text-[10px] text-foreground flex-1">{pk.alias || `Passkey ${i + 1}`}</span>
                        {pk.createdAt && <span className="text-[9px] text-muted-foreground">{new Date(pk.createdAt).toLocaleDateString()}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SecurityMethodCard>

            {/* World ID */}
            <SecurityMethodCard
              icon={Globe}
              title="World ID"
              subtitle="Cryptographic proof of unique human. Strongest Sybil resistance for Tier 2."
              statusLabel={worldIdVerified ? "Verified" : "Not verified"}
              statusOk={worldIdVerified}
              themeHsl="239 84% 67%"
            >
              <WorldIdGate address={address} compact />
            </SecurityMethodCard>

            {/* Ledger */}
            <SecurityMethodCard
              icon={Usb}
              title="Ledger"
              subtitle="Sign confirmations on your hardware wallet via USB or Bluetooth."
              statusLabel="Hardware"
              statusOk={false}
              themeHsl="25 95% 53%"
            >
              <p className="text-[10px] text-muted-foreground mb-3">
                Connect via USB or Bluetooth. Requires Chrome 89+, Edge 89+, or Brave on desktop.
              </p>
              <LedgerGate />
            </SecurityMethodCard>

          </div>
        </div>

        {/* ── Confirmation method — stacked list ── */}
        <CollapsibleSection title="Confirmation method" defaultOpen>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              How you verify Tier 2 transactions before they are signed
            </p>

            <div className="space-y-2">
              <ConfirmMethodRow
                icon={Fingerprint}
                method="passkey"
                title="Passkey (Face ID / Touch ID)"
                description="Biometric verification via WebAuthn — fastest and most secure"
                recommended
                badge={passkeyRegistered
                  ? <StatusBadge variant="safe">Ready</StatusBadge>
                  : <StatusBadge variant="warning">Not set up</StatusBadge>
                }
                selected={confirmationMethod === "passkey"}
                onSelect={() => handleConfirmationChange("passkey")}
              >
                <p className="text-[11px] text-muted-foreground mt-2">
                  Uses WebAuthn to authenticate with your device biometrics or security key. No server-side secrets stored.
                </p>
              </ConfirmMethodRow>

              <ConfirmMethodRow
                icon={Globe}
                method="worldid"
                title="World ID (Proof of Human)"
                description="Cryptographic proof of unique human — strongest Sybil resistance"
                badge={worldIdVerified
                  ? <StatusBadge variant="safe">Verified</StatusBadge>
                  : <StatusBadge variant="warning">Not verified</StatusBadge>
                }
                selected={confirmationMethod === "worldid"}
                onSelect={() => handleConfirmationChange("worldid")}
              >
                <p className="text-[11px] text-muted-foreground mt-2">
                  Requires a one-time scan with the Worldcoin app. Provides zero-knowledge proof of humanity without revealing identity.
                </p>
              </ConfirmMethodRow>

              <ConfirmMethodRow
                icon={Usb}
                method="ledger"
                title="Hardware wallet (Ledger)"
                description="Sign confirmation on your Ledger device"
                selected={confirmationMethod === "ledger"}
                onSelect={() => handleConfirmationChange("ledger")}
              >
                <p className="text-[11px] text-muted-foreground mt-2">
                  The transaction details are displayed on your Ledger screen. Physical button press confirms intent.
                </p>
              </ConfirmMethodRow>

              <ConfirmMethodRow
                icon={Type}
                method="manual"
                title="Manual approval"
                description='Type "CONFIRM" in the dashboard — lowest security, no hardware needed'
                selected={confirmationMethod === "manual"}
                onSelect={() => handleConfirmationChange("manual")}
              />
            </div>

            {saving && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <InfinityLoader size={12} />
                Saving...
              </div>
            )}

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                <span className="text-foreground">Tier 3 escalation</span> — override for hard-blocked transactions
              </p>
              <select
                value={tier3Escalation}
                onChange={(e) => handleTier3Change(e.target.value)}
                className="w-full bg-vanta-elevated border border-border text-foreground rounded-lg px-3 py-2 text-xs"
              >
                <option value="passkey-15">Passkey + 15 min delay</option>
                <option value="worldid-24">World ID + 24h delay</option>
                <option value="ledger-24">Ledger + 24h delay</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Email Notifications ── */}
        <CollapsibleSection title="Email notifications">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Get notified when an agent submits a Tier 2 or Tier 3 transaction.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailSaved(false) }}
                  className="pl-9 bg-vanta-elevated border-border text-foreground placeholder:text-muted-foreground text-xs h-9"
                />
              </div>
              <Button
                onClick={handleEmailSave}
                disabled={saving || !email}
                className="bg-[#00FFB2] text-black hover:bg-[#00FFB2]/90 h-9 min-w-[72px] text-xs"
              >
                {saving ? <InfinityLoader size={12} /> : emailSaved ? <><Check size={12} className="mr-1" />Saved</> : "Save"}
              </Button>
            </div>
            {user?.email && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Check size={10} className="text-[#00FFB2]" />
                Sending to <span className="text-foreground ml-1">{user.email}</span>
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* ── Danger Zone ── */}
        <CollapsibleSection title="Danger zone" danger>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Pause daemon</p>
                <p className="text-xs text-muted-foreground mt-0.5">Temporarily disable all security checks</p>
              </div>
              <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-400/10 h-8 text-xs">
                <AlertTriangle size={12} className="mr-1.5" /> Pause
              </Button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Disconnect all agents</p>
                <p className="text-xs text-muted-foreground mt-0.5">Remove all connected AI agents</p>
              </div>
              <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-400/10 h-8 text-xs">
                Disconnect all
              </Button>
            </div>
          </div>
        </CollapsibleSection>

      </div>
    </DashboardLayout>
  )
}
