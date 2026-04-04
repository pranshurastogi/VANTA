'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";

const STYLE_ID = "vanta-hero-animations";

const injectStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.innerHTML = `
    @keyframes vanta-hero-intro {
      0% { opacity: 0; transform: translate3d(0, 64px, 0) scale(0.98); filter: blur(12px); }
      60% { filter: blur(0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
    }
    @keyframes vanta-orbit {
      0% { stroke-dashoffset: 0; transform: rotate(0deg); }
      100% { stroke-dashoffset: -64; transform: rotate(360deg); }
    }
    @keyframes vanta-grid {
      0%, 100% { transform: rotate(-2deg); opacity: 0.7; }
      50% { transform: rotate(2deg); opacity: 1; }
    }
    @keyframes vanta-pulse {
      0%, 100% { stroke-dasharray: 0 200; opacity: 0.2; }
      45%, 60% { stroke-dasharray: 200 0; opacity: 1; }
    }
    @keyframes vanta-glow {
      0%, 100% { opacity: 0.35; transform: translate3d(0,0,0); }
      50% { opacity: 0.7; transform: translate3d(0,-8px,0); }
    }
    @keyframes vanta-drift {
      0%, 100% { transform: translate3d(0,0,0) rotate(-3deg); }
      50% { transform: translate3d(0,-12px,0) rotate(3deg); }
    }
  `;
  document.head.appendChild(style);
};

const ShieldGlyph = () => (
  <svg viewBox="0 0 120 120" className="h-16 w-16" aria-hidden>
    <circle
      cx="60"
      cy="60"
      r="46"
      fill="none"
      stroke="#00FFB2"
      strokeWidth="1.4"
      style={{ strokeDasharray: "18 14", animation: "vanta-orbit 8.5s linear infinite", transformOrigin: "60px 60px" }}
    />
    <rect
      x="34"
      y="34"
      width="52"
      height="52"
      rx="14"
      fill="rgba(0,255,178,0.06)"
      stroke="#00FFB2"
      strokeWidth="1.2"
      style={{ animation: "vanta-grid 5.4s ease-in-out infinite", transformOrigin: "60px 60px" }}
    />
    <circle cx="60" cy="60" r="7" fill="#00FFB2" />
    <path
      d="M60 30v10M60 80v10M30 60h10M80 60h10"
      stroke="#00FFB2"
      strokeWidth="1.4"
      strokeLinecap="round"
      style={{ animation: "vanta-pulse 6s ease-in-out infinite" }}
    />
  </svg>
);

const setSpotlight = (event: React.MouseEvent<HTMLLIElement>) => {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty("--vanta-x", `${event.clientX - rect.left}px`);
  target.style.setProperty("--vanta-y", `${event.clientY - rect.top}px`);
};

const clearSpotlight = (event: React.MouseEvent<HTMLLIElement>) => {
  const target = event.currentTarget;
  target.style.removeProperty("--vanta-x");
  target.style.removeProperty("--vanta-y");
};

export function VantaHero() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"policy" | "risk">("policy");
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") {
      setVisible(true);
      return;
    }
    const node = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const metrics = [
    { label: "Risk tiers", value: "3" },
    { label: "Rule types", value: "8" },
    { label: "Avg response", value: "<2s" },
  ];

  const modes = useMemo(
    () => ({
      policy: {
        title: "Policy engine",
        description:
          "Every proposed transaction runs through your configured rules before it touches the network. Limits, allowlists, blacklists, and calldata checks execute in under two seconds.",
        items: [
          "Daily and per-transaction spend limits",
          "Contract allowlists and hard-blocked addresses",
          "Unlimited approval detection and calldata stripping",
        ],
      },
      risk: {
        title: "Risk analysis",
        description:
          "An AI scanner evaluates calldata structure, counterparty context, and anomaly signals. Results set the tier floor and feed the human review screen where confirmation is required.",
        items: [
          "Gemini-powered calldata classification",
          "Heuristic fallback when AI is unavailable",
          "Score escalates tier, never downgrades it",
        ],
      },
    }),
    []
  );

  const activeMode = modes[mode];

  const tiers = [
    {
      name: "Tier 1 — Auto approve",
      detail: "Known destinations, small amounts, and read-only calls proceed without interruption.",
      status: "Clear",
    },
    {
      name: "Tier 2 — Human gate",
      detail: "New recipients, token approvals, or amounts above threshold require your explicit confirmation.",
      status: "Confirm",
    },
    {
      name: "Tier 3 — Hard block",
      detail: "Known drainers, unlimited approvals, and attempts to disable guardrails are rejected outright.",
      status: "Block",
    },
  ];

  const tierStatusColor: Record<string, string> = {
    Clear: "text-emerald-400",
    Confirm: "text-[#FFB800]",
    Block: "text-[#FF3B3B]",
  };

  return (
    <div className="relative isolate min-h-screen w-full bg-[#0A0A0A] text-[#E5E5E5]">
      {/* Background radial gradients */}
      <div
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 80% 60% at 10% -10%, rgba(0,255,178,0.08), transparent 60%)",
            "radial-gradient(ellipse 90% 70% at 90% -20%, rgba(255,184,0,0.05), transparent 70%)",
          ].join(", "),
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-60"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 25% 25%, rgba(0,255,178,0.06) 0.7px, transparent 1px)",
            "radial-gradient(circle at 75% 75%, rgba(0,255,178,0.04) 0.7px, transparent 1px)",
          ].join(", "),
          backgroundSize: "12px 12px",
          backgroundRepeat: "repeat",
        }}
      />
      {/* Top glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(60% 50% at 50% 10%, rgba(0,255,178,0.1), transparent 70%)",
          filter: "blur(22px)",
        }}
      />

      <section
        ref={sectionRef}
        className="relative flex min-h-screen w-full flex-col gap-16 px-6 py-24 md:gap-20 md:px-10 lg:px-16 xl:px-24"
        style={
          visible
            ? { animation: "vanta-hero-intro 1s cubic-bezier(.22,.68,0,1) forwards" }
            : { opacity: 0 }
        }
      >
        {/* Header grid */}
        <header className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#00FFB2]/30 bg-[#00FFB2]/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#00FFB2]">
                Transaction security daemon
              </span>
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                Policy and approvals between agents and the chain.
                <span className="mt-2 block text-[#00FFB2]">
                  High-impact transfers require explicit human consent.
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[#999999] md:text-lg">
                Vanta is a transaction guardrail layer for wallets operated by AI. It evaluates each proposed action against your policy, surfaces risk for review, and blocks known drainers and unsafe approvals before they broadcast.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex flex-wrap gap-3 rounded-full border border-[#1F1F1F] bg-[#111111] px-5 py-3 text-xs uppercase tracking-[0.3em]">
                <span className="flex items-center gap-2 text-[#00FFB2]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00FFB2] animate-pulse" />
                  Dual approval active
                </span>
                <span className="text-[#444]">∙</span>
                <span className="text-[#666]">Automated preparation. Governed execution.</span>
              </div>
              <div className="flex divide-x divide-[#1F1F1F] overflow-hidden rounded-full border border-[#1F1F1F] text-xs uppercase tracking-[0.35em]">
                {metrics.map((metric) => (
                  <div key={metric.label} className="flex flex-col px-5 py-3">
                    <span className="text-[11px] text-[#666]">{metric.label}</span>
                    <span className="text-lg font-semibold tracking-tight text-[#E5E5E5]">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mode card */}
          <div className="relative flex flex-col gap-6 rounded-3xl border border-[#1F1F1F] bg-[#111111]/80 p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-[#666]">Engine</p>
                <h2 className="text-xl font-semibold tracking-tight">{activeMode.title}</h2>
              </div>
              <ShieldGlyph />
            </div>
            <p className="text-sm leading-relaxed text-[#999]">{activeMode.description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("policy")}
                className={`flex-1 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-all duration-300 ${
                  mode === "policy"
                    ? "border-[#00FFB2] bg-[#00FFB2] text-black"
                    : "border-[#1F1F1F] bg-[#1A1A1A] text-[#999] hover:border-[#00FFB2]/40"
                }`}
              >
                Policy
              </button>
              <button
                type="button"
                onClick={() => setMode("risk")}
                className={`flex-1 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-all duration-300 ${
                  mode === "risk"
                    ? "border-[#00FFB2] bg-[#00FFB2] text-black"
                    : "border-[#1F1F1F] bg-[#1A1A1A] text-[#999] hover:border-[#00FFB2]/40"
                }`}
              >
                Risk analysis
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {activeMode.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[#999]">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#00FFB2]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* Three-column section */}
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] xl:items-stretch">

          {/* Left card */}
          <div className="order-2 flex flex-col gap-6 rounded-3xl border border-[#1F1F1F] bg-[#111111]/80 p-8 xl:order-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.35em] text-[#666]">What you get</h3>
              <span className="text-xs uppercase tracking-[0.35em] text-[#444]">v1.0</span>
            </div>
            <p className="text-sm leading-relaxed text-[#999]">
              A control plane that sits between your agent and the chain. Policy runs outside the conversational model so arbitrary prompt text cannot expand privileges or disable protections.
            </p>
            <div className="grid gap-3">
              {[
                "Dual gate: policy plus human confirmation",
                "On-chain data minimization for calldata",
                "Deny-by-default for high-risk patterns",
              ].map((item) => (
                <div
                  key={item}
                  className="relative overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3 text-xs uppercase tracking-[0.3em] text-[#999] transition duration-500 hover:-translate-y-0.5 hover:border-[#00FFB2]/30 hover:shadow-[0_14px_40px_rgba(0,255,178,0.08)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Center image */}
          <figure className="order-1 overflow-hidden rounded-[32px] border border-[#1F1F1F] xl:order-2" style={{ position: "relative" }}>
            <div className="relative w-full pb-[120%] sm:pb-[90%] lg:pb-[72%]">
              <img
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
                alt="Circuit board close-up representing transaction security architecture"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 ease-out hover:scale-[1.03] hover:opacity-90"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-transparent to-[#0A0A0A]/70" />
              <div className="pointer-events-none absolute inset-0 border border-[#00FFB2]/10 mix-blend-overlay" />
              <span
                className="pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full border border-[#00FFB2]/20 opacity-50"
                style={{ animation: "vanta-glow 9s ease-in-out infinite" }}
              />
              <span
                className="pointer-events-none absolute -right-12 bottom-16 h-48 w-48 rounded-full border border-[#00FFB2]/10 opacity-30"
                style={{ animation: "vanta-drift 12s ease-in-out infinite" }}
              />
            </div>
            <figcaption className="flex items-center justify-between px-6 py-5 text-xs uppercase tracking-[0.35em] text-[#666]">
              <span>Transaction layer</span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-8 bg-[#00FFB2]/40" />
                Verifiable execution
              </span>
            </figcaption>
          </figure>

          {/* Right card — tiers */}
          <aside className="order-3 flex flex-col gap-6 rounded-3xl border border-[#1F1F1F] bg-[#111111]/80 p-8 xl:order-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.35em] text-[#666]">Risk tiers</h3>
              <span className="text-xs uppercase tracking-[0.35em] text-[#444]">3 levels</span>
            </div>
            <ul className="space-y-4">
              {tiers.map((tier, index) => (
                <li
                  key={tier.name}
                  onMouseMove={setSpotlight}
                  onMouseLeave={clearSpotlight}
                  className="group relative overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] px-5 py-4 transition duration-500 hover:-translate-y-0.5 hover:border-[#00FFB2]/20"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(190px circle at var(--vanta-x, 50%) var(--vanta-y, 50%), rgba(0,255,178,0.07), transparent 72%)",
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight text-[#E5E5E5]">{tier.name}</h4>
                    <span className={`text-[10px] uppercase tracking-[0.35em] font-mono ${tierStatusColor[tier.status]}`}>
                      {tier.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#666]">{tier.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default VantaHero;
