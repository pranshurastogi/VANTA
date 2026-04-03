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
  Settings
} from "lucide-react"
import { VantaWordmark } from "./logo"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
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

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-vanta-bg border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vanta-teal">
          <VantaWordmark />
        </Link>
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
      <div className="p-4 mx-3 mb-4 bg-vanta-surface rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-2">
          <PulsingDot />
          <span className="text-[11px] text-vanta-text-secondary">Connected</span>
        </div>
        <div className="font-mono text-[13px] text-vanta-text-muted mb-1">
          0x1a2b...9f3e
        </div>
        <div className="text-[13px] text-foreground mb-2">
          vanta.pranshu.eth
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-vanta-teal/10 text-vanta-teal text-[10px]">
          World ID ✓
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const mobileNavItems = navItems.slice(0, 5) // Exclude settings for mobile

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
