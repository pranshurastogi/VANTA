"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  ArrowUpDown,
  Shield,
  ScanEye,
  Bot,
  Settings,
  LogOut,
  Copy,
  Check,
} from "lucide-react"
import { VantaLogo } from "./logo"
import { cn } from "@/lib/utils"
import { useDynamic } from "@/lib/dynamic/context"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowUpDown },
  { href: "/rules", label: "Rules", icon: Shield },
  { href: "/scanner", label: "Scanner", icon: ScanEye },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
]

function PulsingDot({ className = "" }: { className?: string }) {
  return (
    <span className={cn("relative flex h-1.5 w-1.5", className)}>
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { wallet, isConnected, connect, disconnect } = useDynamic()
  const [copied, setCopied] = useState(false)

  const address = wallet?.address
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-vanta-bg border-r border-border flex flex-col z-50">
      {/* Logo section */}
      <Link
        href="/dashboard"
        className="group relative flex flex-col items-center gap-1.5 px-4 py-5 border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vanta-teal focus-visible:ring-inset overflow-hidden"
      >
        {/* Ambient glow behind logo */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,255,178,0.06), transparent 70%)" }}
        />

        <div className="relative">
          {/* Subtle halo ring */}
          <div className="absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"
            style={{ background: "#00FFB2", transform: "scale(1.8)" }}
          />
          <VantaLogo size={36} className="relative opacity-90 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-semibold tracking-[0.22em] text-foreground leading-none">
            VANTA
          </span>
          <span className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase leading-none">
            wallet daemon
          </span>
        </div>
      </Link>

      {/* Network badge */}
      <div className="mx-4 mt-3 mb-1 flex items-center gap-2 px-3 py-1.5 bg-vanta-elevated/60 rounded-lg border border-border/50">
        <PulsingDot />
        <span className="text-[10px] font-mono text-vanta-text-muted">Ethereum Sepolia</span>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-vanta-teal/10 text-vanta-teal font-medium">testnet</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                    isActive
                      ? "bg-vanta-elevated text-foreground"
                      : "text-vanta-text-muted hover:text-vanta-text-secondary hover:bg-vanta-elevated/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-vanta-teal rounded-r"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Wallet Card */}
      <div className="p-3 mx-3 mb-4">
        {isConnected && shortAddress ? (
          <div className="bg-vanta-surface border border-border rounded-xl p-3">
            {/* Status row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PulsingDot />
                <span className="text-[11px] text-vanta-text-secondary">Connected</span>
              </div>
              {/* Copy address */}
              <button
                onClick={handleCopy}
                title="Copy address"
                className="text-vanta-text-muted hover:text-foreground transition-colors p-1 rounded"
              >
                {copied ? <Check size={12} className="text-vanta-teal" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Address */}
            <div className="font-mono text-[13px] text-foreground mb-2.5">
              {shortAddress}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-vanta-teal/10 text-vanta-teal text-[10px]">
                Sepolia
              </div>
              {/* Disconnect */}
              <button
                onClick={disconnect}
                title="Disconnect wallet"
                className="flex items-center gap-1 text-[11px] text-vanta-text-muted hover:text-vanta-red transition-colors"
              >
                <LogOut size={12} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={connect}
            className="w-full bg-vanta-surface border border-border rounded-xl p-3 text-left hover:border-vanta-teal/40 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-text-muted" />
              </span>
              <span className="text-[11px] text-vanta-text-muted">Not connected</span>
            </div>
            <span className="text-[12px] text-vanta-teal group-hover:underline transition-all">
              Connect wallet →
            </span>
          </button>
        )}
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const mobileNavItems = navItems.slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-vanta-bg border-t border-border md:hidden z-50">
      <ul className="flex items-center justify-around h-full">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 relative",
                  isActive ? "text-vanta-teal" : "text-vanta-text-muted"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-vanta-teal rounded-b"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
