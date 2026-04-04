"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { ArrowRight, LayoutDashboard, ShieldAlert, BrainCircuit, AlertTriangle, CheckCircle2, XCircle, Fingerprint, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VantaLogo } from "@/components/vanta/logo"

// ── reusable fade-in-up wrapper ───────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 0.68, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── animated transaction stream (hero decoration) ────────────────────────────

const STREAM_ITEMS = [
  { label: "Transfer · 0.4 ETH", tier: "T1", color: "#00FFB2", status: "Auto" },
  { label: "Token approval · USDC", tier: "T2", color: "#FFB800", status: "Review" },
  { label: "Unknown drainer", tier: "T3", color: "#FF3B3B", status: "Block" },
  { label: "DEX swap · $120", tier: "T1", color: "#00FFB2", status: "Auto" },
  { label: "New recipient · 1.2 ETH", tier: "T2", color: "#FFB800", status: "Review" },
]

function TxStream() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % STREAM_ITEMS.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-3xl border border-[#00FFB2]/10 bg-gradient-to-b from-[#00FFB2]/4 to-transparent pointer-events-none" />

      <div className="px-5 py-6 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#555]">Transaction stream</span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#00FFB2] animate-ping opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00FFB2]" />
          </span>
        </div>

        {STREAM_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: i === active ? 1 : 0.25,
              x: i === active ? 0 : -4,
              scale: i === active ? 1 : 0.97,
            }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2.5"
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="flex-1 text-xs text-[#999] truncate">{item.label}</span>
            <span
              className="text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md"
              style={{ color: item.color, background: `${item.color}12` }}
            >
              {item.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── animated flow diagram ─────────────────────────────────────────────────────

const FLOW_STEPS = [
  { label: "Agent builds tx", sub: "Calldata constructed", icon: BrainCircuit, color: "#666" },
  { label: "Policy check", sub: "Rules evaluated", icon: Shield, color: "#00FFB2" },
  { label: "Risk scored", sub: "AI assessment", icon: ShieldAlert, color: "#FFB800" },
  { label: "Human gate", sub: "Explicit confirmation", icon: Fingerprint, color: "#FFB800" },
  { label: "Broadcast", sub: "On-chain", icon: CheckCircle2, color: "#00FFB2" },
]

function FlowDiagram() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <div ref={ref} className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-center gap-0 min-w-[560px]">
        {FLOW_STEPS.map((step, i) => {
          const Icon = step.icon
          const isGate = i === 1 || i === 2 || i === 3
          return (
            <div key={i} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 0.68, 0, 1] }}
                className="flex flex-col items-center gap-2 w-24"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border"
                  style={{
                    borderColor: `${step.color}40`,
                    background: `${step.color}10`,
                    boxShadow: isGate ? `0 0 20px ${step.color}20` : "none",
                  }}
                >
                  <Icon size={18} style={{ color: step.color }} />
                </div>
                <span className="text-[11px] font-medium text-[#ccc] text-center leading-tight">{step.label}</span>
                <span className="text-[10px] text-[#555] text-center">{step.sub}</span>
              </motion.div>

              {i < FLOW_STEPS.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.1 + 0.3 }}
                  className="h-px w-8 origin-left"
                  style={{ background: "linear-gradient(90deg, #333, #444)" }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Block path below */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="flex justify-center mt-6"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/6">
          <XCircle size={13} className="text-[#FF3B3B]" />
          <span className="text-[11px] text-[#FF3B3B]">Policy fail or confirmation declined → rejected, never broadcast</span>
        </div>
      </motion.div>
    </div>
  )
}

// ── tier gate cards ────────────────────────────────────────────────────────────

const TIER_GATES = [
  {
    tier: "Tier 1",
    label: "Auto approve",
    color: "#00FFB2",
    description: "Small amounts, known addresses, read-only calls. Zero friction.",
    examples: ["Gas top-ups", "Allowlisted DEX routes", "Portfolio reads"],
    badge: "PASS",
  },
  {
    tier: "Tier 2",
    label: "Human gate",
    color: "#FFB800",
    description: "New recipients, token approvals, amounts above threshold. You decide.",
    examples: ["First-time recipient", "Token approvals", "Above daily limit"],
    badge: "REVIEW",
  },
  {
    tier: "Tier 3",
    label: "Hard block",
    color: "#FF3B3B",
    description: "Known drainers, unlimited approvals, attempts to disable guardrails.",
    examples: ["Drainer contracts", "Unlimited approvals", "Blocklisted addresses"],
    badge: "BLOCK",
  },
]

// ── numbers bar ───────────────────────────────────────────────────────────────

const STATS = [
  { value: "3", label: "Risk tiers" },
  { value: "8+", label: "Rule types" },
  { value: "<2s", label: "Scan time" },
  { value: "3", label: "Auth methods" },
]

// ── page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -80])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] overflow-x-hidden">

      {/* ── nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <VantaLogo size={24} />
            <span className="text-sm font-semibold tracking-[0.15em] text-white">VANTA</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#666] md:flex">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#gates" className="hover:text-white transition-colors">Risk gates</a>
            <a href="#scanner" className="hover:text-white transition-colors">Scanner</a>
          </nav>
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-[#00FFB2] text-black hover:bg-[#00FFB2]/90 text-xs font-semibold tracking-wide h-8 px-4"
          >
            <Link href="/dashboard">
              Launch app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden">

        {/* Background ambience */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse 70% 50% at 15% -5%, rgba(0,255,178,0.07), transparent 55%)",
              "radial-gradient(ellipse 60% 60% at 85% 110%, rgba(255,184,0,0.04), transparent 60%)",
            ].join(", "),
          }}
        />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,255,178,0.08) 0.8px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-24 pb-20"
        >
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">

            {/* Text */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 0.68, 0, 1] }}
              >
                <h1 className="text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
                  AI agents shouldn&rsquo;t sign
                  <br />
                  <span className="text-[#00FFB2]">without a gatekeeper.</span>
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 0.68, 0, 1] }}
              >
                <p className="text-base leading-relaxed text-[#777] max-w-xl">
                  VANTA sits between your AI agent and the blockchain. Every proposed
                  transaction is scored, tiered, and — where it matters — handed to you for
                  explicit confirmation before it touches the network.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <Button
                  asChild
                  className="gap-2 bg-[#00FFB2] text-black hover:bg-[#00FFB2]/90 font-semibold h-11 px-6"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Open dashboard
                  </Link>
                </Button>
                <a
                  href="#how"
                  className="flex items-center gap-1.5 text-sm text-[#666] hover:text-white transition-colors"
                >
                  How it works
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </motion.div>

              {/* Stats bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex divide-x divide-[#1a1a1a] overflow-hidden rounded-2xl border border-[#1a1a1a] w-fit"
              >
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col px-5 py-3">
                    <span className="text-lg font-semibold tracking-tight text-white font-mono">{s.value}</span>
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — transaction stream */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 0.68, 0, 1] }}
            >
              <TxStream />
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll nudge */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] text-[#444] uppercase tracking-[0.3em]">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-[#444] to-transparent" />
        </motion.div>
      </section>

      {/* ── threat statement ── */}
      <section className="border-y border-white/5 bg-[#080808]">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#444] mb-4">The problem</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl max-w-2xl leading-[1.1]">
              An agent with signing access is one prompt injection away from draining your wallet.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: ShieldAlert,
                title: "Prompt injection",
                body: "Adversarial content in conversation context steers the model into signing harmful transactions.",
                color: "#FF3B3B",
              },
              {
                icon: AlertTriangle,
                title: "Social engineering",
                body: "Urgency, impersonation, and pressure tactics push automated flows toward unsafe approvals.",
                color: "#FFB800",
              },
              {
                icon: BrainCircuit,
                title: "Model error",
                body: "Ambiguous intent or wrong parameters produce valid-looking transactions that don't match what you meant.",
                color: "#FFB800",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={i * 0.1}>
                  <div className="group rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 hover:border-[#2a2a2a] transition-colors">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: `${item.color}14`, border: `1px solid ${item.color}30` }}
                    >
                      <Icon size={16} style={{ color: item.color }} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-[#666]">{item.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-24">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#444] mb-4">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight max-w-xl leading-[1.1]">
            Every transaction passes through a gauntlet before it reaches the chain.
          </h2>
          <p className="mt-4 text-sm text-[#666] max-w-lg leading-relaxed">
            VANTA runs outside the conversational model. Arbitrary prompt text cannot
            expand privileges or disable enforcement.
          </p>
        </Reveal>

        <div className="mt-16">
          <FlowDiagram />
        </div>
      </section>

      {/* ── tier gates ── */}
      <section id="gates" className="border-y border-white/5 bg-[#080808]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#444] mb-4">Risk gates</p>
            <h2 className="text-3xl font-semibold tracking-tight max-w-xl leading-[1.1]">
              Friction proportional to impact.
            </h2>
            <p className="mt-4 text-sm text-[#666] max-w-lg leading-relaxed">
              Low-risk operations proceed without interruption. Consequential ones
              require your explicit consent. Dangerous ones never reach the network.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TIER_GATES.map((gate, i) => (
              <Reveal key={gate.tier} delay={i * 0.12}>
                <div
                  className="relative rounded-2xl border bg-[#0d0d0d] p-6 overflow-hidden group"
                  style={{ borderColor: `${gate.color}30` }}
                >
                  {/* Glow */}
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40"
                    style={{ background: gate.color }}
                  />

                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: gate.color }}>
                        {gate.tier}
                      </p>
                      <h3 className="text-base font-semibold text-white mt-1">{gate.label}</h3>
                    </div>
                    <span
                      className="text-[9px] font-mono font-bold tracking-[0.2em] px-2.5 py-1 rounded-full"
                      style={{ color: gate.color, background: `${gate.color}15`, border: `1px solid ${gate.color}30` }}
                    >
                      {gate.badge}
                    </span>
                  </div>

                  <p className="text-sm text-[#666] leading-relaxed mb-5">{gate.description}</p>

                  <div className="space-y-1.5">
                    {gate.examples.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-[11px] text-[#555]">
                        <span className="h-1 w-1 rounded-full shrink-0" style={{ background: gate.color, opacity: 0.7 }} />
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI scanner section ── */}
      <section id="scanner" className="mx-auto w-full max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#444] mb-4">AI scanner</p>
            <h2 className="text-3xl font-semibold tracking-tight max-w-lg leading-[1.1]">
              Every transaction scored before you see the confirmation screen.
            </h2>
            <p className="mt-5 text-sm text-[#666] leading-relaxed max-w-md">
              Gemini-powered analysis evaluates calldata structure, counterparty context,
              and anomaly signals. The score sets the tier floor — it can escalate,
              never downgrade.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { label: "Calldata classification", pass: true },
                { label: "Counterparty risk check", pass: true },
                { label: "Unlimited approval detection", pass: true },
                { label: "Anomaly signals", pass: true },
              ].map((check, i) => (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 size={14} className="text-[#00FFB2] shrink-0" />
                  <span className="text-sm text-[#888]">{check.label}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>

          {/* Risk score card */}
          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444] mb-4">Sample assessment</p>

              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-white">Token approval · USDC</p>
                  <p className="text-xs text-[#555] mt-0.5">via DeFi manager agent</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-[#FFB80015] text-[#FFB800] border border-[#FFB80030]">
                  T2 · REVIEW
                </span>
              </div>

              {/* Animated risk bar */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#FFB800]">Medium risk</span>
                  <span className="font-mono text-[#555]">61 / 100</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#111] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "61%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-[#FFB800]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Known contract address", pass: true },
                  { label: "Approval amount within limit", pass: true },
                  { label: "First interaction with spender", pass: false },
                  { label: "No blocklist match", pass: true },
                ].map((check) => (
                  <div key={check.label} className="flex items-center gap-2 text-xs">
                    {check.pass ? (
                      <CheckCircle2 size={12} className="text-[#00FFB2] shrink-0" />
                    ) : (
                      <XCircle size={12} className="text-[#FF3B3B] shrink-0" />
                    )}
                    <span className={check.pass ? "text-[#666]" : "text-[#ccc]"}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── confirmation methods ── */}
      <section className="border-y border-white/5 bg-[#080808]">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <Reveal className="text-center max-w-xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#444] mb-4">Confirmation</p>
            <h2 className="text-2xl font-semibold tracking-tight leading-[1.1]">
              Your key. Your approval.
            </h2>
            <p className="mt-4 text-sm text-[#666] leading-relaxed">
              High-risk transactions require explicit human confirmation through a method you choose.
            </p>
          </Reveal>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {[
              { label: "Passkey", sub: "WebAuthn biometric", color: "#00FFB2" },
              { label: "World ID", sub: "Proof of personhood", color: "#6366f1" },
              { label: "Ledger", sub: "Hardware signing", color: "#f97316" },
            ].map((method, i) => (
              <Reveal key={method.label} delay={i * 0.1}>
                <div
                  className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border bg-[#0d0d0d] min-w-[160px]"
                  style={{ borderColor: `${method.color}30` }}
                >
                  <span
                    className="text-base font-semibold"
                    style={{ color: method.color }}
                  >
                    {method.label}
                  </span>
                  <span className="text-[11px] text-[#555]">{method.sub}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-28">
        <Reveal className="text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl leading-[1.08] max-w-2xl mx-auto">
            Automated preparation.
            <br />
            <span className="text-[#00FFB2]">Governed execution.</span>
          </h2>
          <p className="mt-5 text-base text-[#666] max-w-lg mx-auto leading-relaxed">
            Your agents move fast. VANTA makes sure they only move in the right direction.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-[#00FFB2] text-black hover:bg-[#00FFB2]/90 font-semibold h-12 px-8"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#222] bg-transparent text-[#999] hover:text-white hover:border-[#333] h-12 px-8"
            >
              <Link href="/agents">
                Connect an agent
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 text-xs text-[#444]">
          <div className="flex items-center gap-2.5">
            <VantaLogo size={18} />
            <span>VANTA</span>
          </div>
          <span className="hidden sm:block">Verifiable Autonomous Notary for Transaction Assurance</span>
        </div>
      </footer>
    </main>
  )
}
