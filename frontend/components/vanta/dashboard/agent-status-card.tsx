"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Bot } from "lucide-react"

const agents = [
  { name: "Trading bot", txns: 3 },
  { name: "DeFi manager", txns: 1 },
]

function PulsingDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
    </span>
  )
}

export function AgentStatusCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-vanta-surface border border-border rounded-xl p-6 h-[180px] flex flex-col"
    >
      <h3 className="text-[13px] text-vanta-text-secondary mb-4">Connected agents</h3>
      <div className="flex-1 flex flex-col justify-center">
        <ul className="space-y-3">
          {agents.map((agent, index) => (
            <motion.li
              key={agent.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.25 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <Bot size={16} className="text-vanta-teal shrink-0" />
              <span className="text-[13px] text-foreground flex-1">{agent.name}</span>
              <span className="text-xs text-vanta-text-muted">{agent.txns} txns today</span>
              <PulsingDot />
            </motion.li>
          ))}
        </ul>
      </div>
      <Link
        href="/agents"
        className="text-xs text-vanta-text-muted hover:text-vanta-text-secondary hover:underline transition-colors mt-auto"
      >
        Connect agent →
      </Link>
    </motion.div>
  )
}
