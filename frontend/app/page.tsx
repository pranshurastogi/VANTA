import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VantaLogo } from "@/components/vanta/logo"
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  LayoutDashboard,
  Lock,
  Shield,
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
      "Untrusted content can embed instructions that steer the model toward signing or approving harmful transactions.",
  },
  {
    icon: AlertTriangle,
    title: "Social engineering",
    description:
      "Pressure tactics and impersonation in conversation context can push automated flows toward unsafe approvals.",
  },
  {
    icon: BrainCircuit,
    title: "Model and tooling error",
    description:
      "Ambiguous user intent, wrong parameters, or incorrect tool use can produce valid-looking transactions that do not match what the user meant.",
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
            <a href="#problem" className="transition-colors hover:text-vanta-text-primary">Threat model</a>
            <a href="#model" className="transition-colors hover:text-vanta-text-primary">Dual approval</a>
            <a href="#tiers" className="transition-colors hover:text-vanta-text-primary">Risk tiers</a>
            <a href="#daemon" className="transition-colors hover:text-vanta-text-primary">Policy engine</a>
          </nav>
          <Button asChild className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-vanta-teal/30 bg-vanta-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-vanta-teal">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Transaction security for agentic wallets
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Policy and approvals between agents and the chain.
            <span className="mt-2 block text-vanta-teal">High-impact transfers require explicit human consent.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-vanta-text-secondary">
            Vanta is a transaction guardrail layer for wallets operated by AI. It evaluates each proposed action against
            policy, surfaces risk for review, and blocks categories of calls such as known drainers and unsafe approvals
            before they are broadcast.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-vanta-teal/40 bg-transparent text-vanta-text-primary hover:bg-vanta-teal/10">
              <a href="#flow">How transactions are reviewed</a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-black/45 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_80px_-24px_rgba(0,255,178,0.45)]">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-vanta-text-muted">What you get</p>
          <div className="space-y-4 text-sm text-vanta-text-secondary">
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-vanta-teal" aria-hidden />
              <p>Dual gate for sensitive operations: configured policy plus human confirmation where required, so a single compromised signal is not enough to move funds.</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-vanta-amber" aria-hidden />
              <p>Reduced on-chain disclosure: optional metadata and memos are minimized or hashed so public calldata carries less operational detail.</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-border bg-vanta-surface/80 p-3">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-vanta-red" aria-hidden />
              <p>Deny-by-policy for high-risk patterns, including known malicious contracts, unconstrained token approvals, and attempts to weaken guardrails.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why agent-connected wallets need a control plane</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          An agent with signing access can initiate transfers and contract calls that cannot be undone. That enables automation,
          but it also expands the attack surface to prompt injection, social engineering, and model error. A dedicated enforcement
          layer reduces exposure before execution.
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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dual approval for high-risk actions</h2>
            <p className="mt-4 text-vanta-text-secondary">
              For operations above your policy threshold, execution requires agreement from both an automated risk assessment
              and an explicit human step. If either rejects the transaction, it does not broadcast.
            </p>
            <div className="mt-6 space-y-3 text-sm text-vanta-text-secondary">
              <p><span className="text-vanta-text-primary">Human review addresses</span> coercion, urgency, and intent: whether the proposed spend matches what you want to authorize.</p>
              <p><span className="text-vanta-text-primary">Automated checks address</span> structure and context: calldata shape, counterparties, anomalies, and policy violations in the proposal.</p>
              <p><span className="text-vanta-text-primary">Net effect</span> is defense in depth: bypassing one layer is insufficient to clear a gated operation.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-vanta-teal/30 bg-gradient-to-br from-vanta-teal/8 to-transparent p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-vanta-teal">Gated path</p>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border bg-black/50 p-3">Policy tier requires human confirmation</div>
              <div className="flex justify-center" aria-hidden>
                <ChevronRight className="h-4 w-4 rotate-90 text-vanta-text-muted" />
              </div>
              <div className="rounded-lg border border-border bg-black/50 p-3">Automated risk evaluation passes</div>
              <div className="flex justify-center" aria-hidden>
                <ChevronRight className="h-4 w-4 rotate-90 text-vanta-text-muted" />
              </div>
              <div className="rounded-lg border border-vanta-teal/30 bg-vanta-teal/10 p-3 text-vanta-text-primary">Transaction submitted to the network</div>
            </div>
          </div>
        </div>
      </section>

      <section id="tiers" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Transaction risk tiers</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          Friction scales with impact. Low-risk, allowlisted behavior can proceed with minimal overhead; higher tiers add
          review, delays, or hard blocks according to your configuration.
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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">On-chain data minimization</h2>
            <p className="mt-4 text-vanta-text-secondary">
              Calldata is public and permanent. Vanta can replace free-text memos and similar fields with hashes or omit
              optional metadata so fewer operational details appear on the ledger.
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
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Daemon policy engine</h2>
        <p className="mt-4 max-w-3xl text-vanta-text-secondary">
          Enforcement runs outside the conversational model. Policy upgrades follow a controlled path; arbitrary prompt text
          cannot expand privileges or disable protections.
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
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Example review flow</h2>
          <p className="mt-4 max-w-3xl text-vanta-text-secondary">
            End-to-end path from user intent to broadcast when policy requires confirmation.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              { n: "01", text: "User requests a swap of USDC for ETH on a configured DEX route." },
              { n: "02", text: "The agent builds calldata; Vanta classifies the action against tier and allowlists." },
              { n: "03", text: "If the tier demands it, the user sees a confirmation screen with plain-language risk context." },
              { n: "04", text: "Automated checks must pass (structure, limits, blocklist, anomaly signals)." },
              { n: "05", text: "Where configured, a hardware signer or second device provides an additional physical approval." },
              { n: "06", text: "Only after all required steps succeed is the transaction sent; otherwise it remains unsigned." },
            ].map((step) => (
              <div key={step.n} className="flex gap-3 rounded-lg border border-border bg-black/45 p-4 text-sm text-vanta-text-secondary">
                <span className="font-mono text-xs tabular-nums text-vanta-text-muted">{step.n}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-vanta-teal/30 bg-gradient-to-r from-vanta-teal/12 to-transparent p-8 sm:p-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for accountable automation</h2>
          <p className="mt-4 max-w-3xl text-vanta-text-secondary">
            Agents can monitor, propose, and prepare transactions quickly. Vanta separates that from irreversible execution:
            policy, disclosure, and human checkpoints apply where your configuration says they matter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 bg-vanta-teal text-black hover:bg-vanta-teal/90">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-vanta-teal/40 bg-transparent text-vanta-text-primary hover:bg-vanta-teal/10">
              <Link href="/agents">Agent integration</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/80 py-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 text-sm text-vanta-text-muted sm:px-6 lg:px-8">
          <p>VANTA — Verifiable Autonomous Notary for Transaction Assurance</p>
          <p className="hidden sm:block">Automated preparation. Governed execution.</p>
        </div>
      </footer>
    </main>
  )
}
