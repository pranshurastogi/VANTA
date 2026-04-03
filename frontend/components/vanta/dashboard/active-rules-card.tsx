"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

const rules = [
  "Daily limit: $500",
  "Whitelist: 8 addresses",
  "Block unlimited approvals",
  "Strip calldata PII",
]

export function ActiveRulesCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="bg-vanta-surface border border-border rounded-xl p-6 h-[180px] flex flex-col"
    >
      <h3 className="text-[13px] text-vanta-text-secondary mb-4">Policy engine</h3>
      <div className="flex-1 flex flex-col justify-center">
        <ul className="space-y-2">
          {rules.map((rule, index) => (
            <motion.li
              key={rule}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
              className="flex items-center gap-2 text-xs text-foreground"
            >
              <Check size={14} className="text-vanta-teal shrink-0" />
              <span>{rule}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <Link
        href="/rules"
        className="text-xs text-vanta-text-muted hover:text-vanta-text-secondary hover:underline transition-colors mt-auto"
      >
        Edit rules →
      </Link>
    </motion.div>
  )
}
