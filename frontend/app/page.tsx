import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VantaLogo } from "@/components/vanta/logo"
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  Lock,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react"

const risks = [
  {
    icon: ShieldAlert,
    title: "Prompt injection",
    description:
      "Malicious text hidden in docs or webpages tries to override your intent and trigger wallet-draining actions.",
  },
  {
    icon: AlertTriangle,
    title: "Social engineering",
    description:
      "Urgency, fake support messages, and authority impersonation pressure your agent into harmful approvals.",
  },
  {
    icon: BrainCircuit,
    title: "AI execution mistakes",
    description:
      "Even without malice, model ambiguity can send funds to the wrong destination or run the wrong contract call.",
  },
]

const tiers = [
  {
    title: "Tier 1 - Auto approve",
    style: "border-emerald-400/40 bg-emerald-400/5",
    points: [
      "Small daily limit and known allowlisted destinations",
      "Simple routines like gas top-ups or portfolio reads",
      "No complex calldata or unknown contract surfaces",
    ],
  },
  {
    title: "Tier 2 - Human confirmation",
    style: "border-vanta-amber/50 bg-vanta-amber/5",
    points: [
      "Amounts above threshold or first-time recipients",
      "New contract interactions and token approvals",
      "Anything outside your normal transaction profile",
    ],
  },
  {
    title: "Tier 3 - Maximum friction",
    style: "border-vanta-red/50 bg-vanta-red/5",
    points: [
      "Potential wallet drains or unlimited approvals",
      "Scam-like urgency and flagged counterparties",
      "Time delay + explicit typed acknowledgment required",
    ],
  },
]

const daemonRules = [
  {
    label: "Always allowed",
    icon: CheckCircle2,
    color: "text-emerald-300",
    items: [
      "Read balances, history, and gas estimates",
      "Micro-transfers under strict daily limits",
      "Transfers to user-owned pre-verified addresses",
    ],
  },
  {
    label: "Needs your confirmation",
    icon: Fingerprint,
    color: "text-vanta-amber",
    items: [
      "New recipient addresses",
      "Any token approvals or contract calls",
      "Amounts above configured threshold",
    ],
  },
  {
    label: "Hard blocked",
    icon: XCircle,
    color: "text-vanta-red",
    items: [
      "Known drainer or sanctioned contracts",
      "Unlimited spending approvals by default",
      "Any attempt to disable guardrails",
    ],
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,255,178,0.08),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.08),transparent_30%),#0A0A0A] text-vanta-text-primary">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <VantaLogo size={28} />
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-vanta-text-primary">VANTA</p>
              <p className="-mt-0.5 text-[10px] uppercase tracking-[0.15em] text-vanta-text-muted">wallet daemon</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-vanta-text-secondary md:flex">
            <a href="#problem" className="transition-colors hover:text-vanta-text-primary">Problem</a>
            <a href="#model" className="transition-colors hover:text-vanta-text-primary">2-of-2 Model</a>
            <a href="#tiers" className="transition-colors hover:text-vanta-text-primary">Risk Tiers</a>
            <a href="#daemon" className="transition-colors hover:text-vanta-text-primary">Daemon</a>
          </nav>
          <Button asChild className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
            <Link href="/dashboard">
              <Rocket className="h-4 w-4" />
              Launch App
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-vanta-teal/30 bg-vanta-teal/10 px-3 py-1 text-xs uppercase tracking-wider text-vanta-teal">
            <Bot className="h-3.5 w-3.5" />
            AI + Crypto Wallet Security
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Let AI move fast.
            <span className="block text-vanta-teal">Keep humans in control.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-vanta-text-secondary">
            Vanta is a verifiable transaction security daemon for AI-driven wallets. We stop prompt injections,
            social-engineering payloads, and model mistakes before they become irreversible on-chain losses.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
              <Link href="/dashboard">
                <Rocket className="h-4 w-4" />
                Launch App
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-vanta-teal/40 bg-transparent text-vanta-text-primary hover:bg-vanta-teal/10">
              <a href="#flow">See Live Flow</a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-black/45 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_80px_-24px_rgba(0,255,178,0.45)]">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-vanta-text-muted">Vanta Core Promise</p>
          <div className="space-y-4 text-sm text-vanta-text-secondary">
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-vanta-teal" />
              <p>Two independent approvals: human + AI must both agree before any high-impact transaction executes.</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <Lock className="mt-0.5 h-4 w-4 text-vanta-amber" />
              <p>Calldata minimization and privacy filtering prevent accidental leakage of business-sensitive context.</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <Wallet className="mt-0.5 h-4 w-4 text-vanta-red" />
              <p>Hard-blocked dangerous classes: drainer contracts, unlimited approvals, and guardrail self-modification.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The core problem</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          Connecting an autonomous AI agent to a wallet gives it keys to money and authority over irreversible actions.
          The benefit is massive productivity. The downside is permanent financial risk.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {risks.map((risk) => (
            <article key={risk.title} className="rounded-xl border border-border bg-black/35 p-5">
              <risk.icon className="h-5 w-5 text-vanta-amber" />
              <h3 className="mt-3 text-lg font-medium">{risk.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-vanta-text-secondary">{risk.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="model" className="border-y border-border/80 bg-black/30">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The 2-of-2 confirmation model</h2>
            <p className="mt-4 text-vanta-text-secondary">
              Borrowing multisig logic for human-AI collaboration: high-risk actions require a human decision and an AI
              risk decision. If either refuses, the transaction stops.
            </p>
            <div className="mt-6 space-y-3 text-sm text-vanta-text-secondary">
              <p><span className="text-vanta-text-primary">Humans catch:</span> emotional pressure, fake urgency, authority abuse.</p>
              <p><span className="text-vanta-text-primary">AI catches:</span> hidden prompt payloads, adversarial instructions, anomaly patterns.</p>
              <p><span className="text-vanta-text-primary">Attacker requirement:</span> fool both systems at the same time.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-vanta-teal/30 bg-gradient-to-br from-vanta-teal/8 to-transparent p-6">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-vanta-teal">Decision Logic</p>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border bg-black/50 p-3">Human approval required</div>
              <div className="flex justify-center">
                <ChevronRight className="h-4 w-4 rotate-90 text-vanta-text-muted" />
              </div>
              <div className="rounded-lg border border-border bg-black/50 p-3">AI risk engine approval required</div>
              <div className="flex justify-center">
                <ChevronRight className="h-4 w-4 rotate-90 text-vanta-text-muted" />
              </div>
              <div className="rounded-lg border border-vanta-teal/30 bg-vanta-teal/10 p-3 text-vanta-text-primary">Broadcast only if both pass</div>
            </div>
          </div>
        </div>
      </section>

      <section id="tiers" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Transaction risk tiers</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          Not every action deserves the same friction. Vanta applies policy-based tiers so speed is preserved for safe
          routines while dangerous operations face escalating controls.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <article key={tier.title} className={`rounded-xl border p-5 ${tier.style}`}>
              <h3 className="text-lg font-medium">{tier.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-vanta-text-secondary">
                {tier.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-black/30">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Calldata leakage is a hidden threat</h2>
            <p className="mt-4 text-vanta-text-secondary">
              Transaction calldata is public forever. Vanta strips identifying context from memos and references,
              replacing sensitive strings with minimal hashes or removing optional metadata entirely.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-border bg-black p-4 text-xs leading-relaxed text-vanta-text-secondary">
{`// Before (unsafe):
memo: "Project Quantum consulting payment - Alice Johnson, invoice #2847"

// After (safe):
memoHash: "0x8f...ab" // no personal/business context on-chain`}
          </pre>
        </div>
      </section>

      <section id="daemon" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Vanta daemon policy engine</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          The daemon enforces non-negotiable boundaries. It never grants itself more power and it never accepts policy
          changes from untrusted prompt context.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {daemonRules.map((rule) => (
            <article key={rule.label} className="rounded-xl border border-border bg-black/35 p-5">
              <div className={`mb-3 flex items-center gap-2 ${rule.color}`}>
                <rule.icon className="h-4 w-4" />
                <h3 className="text-base font-medium text-vanta-text-primary">{rule.label}</h3>
              </div>
              <ul className="space-y-2 text-sm text-vanta-text-secondary">
                {rule.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-vanta-text-muted" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="border-y border-border/70 bg-black/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Real-world transaction flow</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              "1. User asks: swap 500 USDC to ETH on Uniswap.",
              "2. AI validates destination, calldata shape, and policy tier.",
              "3. If Tier 2/3, Vanta opens explicit human confirmation.",
              "4. AI displays risk explanation, not just a yes/no output.",
              "5. Optional hardware wallet requires physical confirmation.",
              "6. Broadcast only after checks pass; else action is blocked.",
            ].map((step) => (
              <div key={step} className="rounded-lg border border-border bg-black/45 p-4 text-sm text-vanta-text-secondary">
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-vanta-teal/30 bg-gradient-to-r from-vanta-teal/12 to-transparent p-8 sm:p-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why Vanta exists</h2>
          <p className="mt-4 max-w-3xl text-vanta-text-secondary">
            The future is an on-chain co-pilot that is proactive, privacy-preserving, and user-aligned. AI should
            handle monitoring, pattern detection, and speed. Humans should retain final judgment for meaningful risk.
            Vanta is that security layer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
              <Link href="/dashboard">
                <Rocket className="h-4 w-4" />
                Launch App
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-vanta-teal/40 bg-transparent text-vanta-text-primary hover:bg-vanta-teal/10">
              <Link href="/agents">Connect Agent</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/80 py-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 text-sm text-vanta-text-muted sm:px-6 lg:px-8">
          <p>VANTA - Verifiable Autonomous Notary for Transaction Assurance</p>
          <p className="hidden sm:block">AI speed. Human authority.</p>
        </div>
      </footer>
    </main>
  )
}
