"use client"

import Link from "next/link"
import { Bell, CheckCircle2, Wallet } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { VantaLogo } from "@/components/vanta/logo"
import { useUser } from "@/hooks/useUser"
import { cn } from "@/lib/utils"

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface TopBarProps {
  title: string
  pendingCount?: number
  onBellClick?: () => void
}

export function TopBar({ title, pendingCount = 0, onBellClick }: TopBarProps) {
  const { user } = useUser()

  return (
    <header className="sticky top-0 h-16 bg-vanta-bg/80 backdrop-blur-sm border-b border-border z-40">
      <div className="flex items-center justify-between h-full px-6 gap-4">

        {/* Left — logo (mobile) + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="md:hidden shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vanta-teal"
            aria-label="VANTA home"
          >
            <VantaLogo size={28} />
          </Link>
          <h1 className="font-mono text-xl font-medium text-foreground truncate">
            {title}
          </h1>
        </div>

        {/* Right — dynamic status + bell */}
        <div className="flex items-center gap-2.5">

          {/* Wallet address pill */}
          {user?.address && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-vanta-surface border border-border"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {user.ens_name ?? shorten(user.address)}
              </span>
            </motion.div>
          )}

          {/* World ID badge */}
          {user?.world_id_verified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30"
              title="World ID verified"
            >
              <CheckCircle2 size={11} className="text-indigo-400" />
              <span className="text-[11px] text-indigo-400 font-medium">Verified</span>
            </motion.div>
          )}

          {/* No wallet connected placeholder */}
          {!user?.address && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-vanta-surface border border-border">
              <Wallet size={12} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Not connected</span>
            </div>
          )}

          {/* Bell */}
          <button
            onClick={onBellClick}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-lg border transition-colors",
              pendingCount > 0
                ? "border-vanta-amber/50 bg-vanta-amber/10 text-vanta-amber hover:bg-vanta-amber/20"
                : "border-border bg-vanta-surface text-muted-foreground hover:text-foreground hover:border-border"
            )}
            aria-label={pendingCount > 0 ? `${pendingCount} pending transactions` : "Notifications"}
          >
            <Bell size={16} />
            <AnimatePresence>
              {pendingCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-vanta-amber text-vanta-bg text-[10px] font-bold"
                >
                  {pendingCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  )
}
