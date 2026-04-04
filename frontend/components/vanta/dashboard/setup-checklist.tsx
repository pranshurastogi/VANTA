"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Wallet,
  Shield,
  Fingerprint,
  Bot,
  Check,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { VantaUser } from "@/hooks/useUser"

interface SetupStep {
  id: string
  label: string
  description: string
  icon: typeof Wallet
  href: string
  done: boolean
}

interface SetupChecklistProps {
  user: VantaUser | null
  rulesCount: number
  hasTransactions: boolean
}

export function SetupChecklist({ user, rulesCount, hasTransactions }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage for dismissal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `vanta_setup_dismissed_${user?.id ?? "anon"}`
      if (localStorage.getItem(key) === "true") setDismissed(true)
    }
  }, [user?.id])

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined" && user?.id) {
      localStorage.setItem(`vanta_setup_dismissed_${user.id}`, "true")
    }
  }

  const steps: SetupStep[] = [
    {
      id: "wallet",
      label: "Connect wallet",
      description: "Link your wallet to start protecting transactions",
      icon: Wallet,
      href: "/onboarding",
      done: !!user,
    },
    {
      id: "rules",
      label: "Set up security rules",
      description: "Configure spending limits, whitelists, and blocked addresses",
      icon: Shield,
      href: "/rules",
      done: rulesCount > 0,
    },
    {
      id: "confirm",
      label: "Choose confirmation method",
      description: "Pick how you verify Tier 2 transactions — Face ID, World ID, or manual",
      icon: Fingerprint,
      href: "/settings",
      done: !!user?.confirmation_method && user.confirmation_method !== "passkey" || rulesCount > 0,
    },
    {
      id: "test",
      label: "Test with agent simulator",
      description: "Simulate a transaction to see your rules in action",
      icon: Bot,
      href: "/agents",
      done: hasTransactions,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  if (dismissed || allDone) return null

  const progress = (completedCount / steps.length) * 100

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="bg-vanta-surface border border-border rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-vanta-teal/10 flex items-center justify-center">
              <Sparkles size={16} className="text-vanta-teal" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Set up your daemon</h3>
              <p className="text-[11px] text-vanta-text-muted">
                {completedCount}/{steps.length} steps complete
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-vanta-text-muted hover:text-foreground transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-vanta-elevated">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-vanta-teal"
          />
        </div>

        {/* Steps */}
        <div className="p-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <Link key={step.id} href={step.href}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group",
                    step.done
                      ? "opacity-60"
                      : "hover:bg-vanta-elevated cursor-pointer"
                  )}
                >
                  {/* Status circle */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      step.done
                        ? "bg-vanta-teal/20 text-vanta-teal"
                        : "bg-vanta-elevated text-vanta-text-muted group-hover:border-vanta-teal/50 border border-border"
                    )}
                  >
                    {step.done ? <Check size={14} /> : <Icon size={14} />}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-sm",
                        step.done
                          ? "text-vanta-text-muted line-through"
                          : "text-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    {!step.done && (
                      <p className="text-[11px] text-vanta-text-muted truncate">
                        {step.description}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  {!step.done && (
                    <ChevronRight
                      size={14}
                      className="text-vanta-text-muted group-hover:text-vanta-teal transition-colors shrink-0"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
