"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertTriangle, XCircle, ChevronDown, Search } from "lucide-react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { mockScanEntries } from "@/lib/mock-data"
import { ScanEntry } from "@/lib/types"

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-vanta-teal" />
    </span>
  )
}

function ResultIcon({ result }: { result: ScanEntry["result"] }) {
  switch (result) {
    case "passed":
      return <Check size={16} className="text-vanta-teal" />
    case "flagged":
      return <AlertTriangle size={16} className="text-vanta-amber" />
    case "blocked":
      return <XCircle size={16} className="text-vanta-red" />
  }
}

function ScoreBar({ score }: { score: number }) {
  const getColor = () => {
    if (score < 30) return "bg-vanta-teal"
    if (score < 70) return "bg-vanta-amber"
    return "bg-vanta-red"
  }

  const getTextColor = () => {
    if (score < 30) return "text-vanta-teal"
    if (score < 70) return "text-vanta-amber"
    return "text-vanta-red"
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-vanta-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${getColor()}`}
        />
      </div>
      <span className={`font-mono text-xs ${getTextColor()}`}>{score}/100</span>
    </div>
  )
}

function ScanEntryRow({ entry }: { entry: ScanEntry }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors duration-150",
          "hover:bg-vanta-elevated"
        )}
        whileTap={{ scale: 0.995 }}
      >
        <span className="font-mono text-xs text-vanta-text-muted w-12">
          {entry.time}
        </span>
        <ResultIcon result={entry.result} />
        <span className="flex-1 text-[13px] text-foreground truncate">
          {entry.description}
        </span>
        <ScoreBar score={entry.score} />
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-vanta-text-muted" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && entry.checks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-vanta-elevated/50 border-t border-border">
              <h4 className="text-xs text-vanta-text-secondary mb-3">Checks performed:</h4>
              <ul className="space-y-2">
                {entry.checks.map((check, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 text-xs text-vanta-text-secondary"
                  >
                    {check.passed ? (
                      <Check size={14} className="text-vanta-teal mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-vanta-red mt-0.5 shrink-0" />
                    )}
                    <span>{check.label}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThreatDatabaseSidebar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState<"clean" | "flagged" | null>(null)

  const handleSearch = () => {
    if (searchQuery.length > 0) {
      // Simulate random result
      setSearchResult(Math.random() > 0.3 ? "clean" : "flagged")
    }
  }

  const recentAdditions = [
    { address: "0x7a3b...4c2e", date: "Mar 31" },
    { address: "0x9f1c...8d3a", date: "Mar 30" },
    { address: "0x2e4d...1f5b", date: "Mar 29" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full lg:w-[280px] bg-vanta-surface border border-border rounded-xl p-4 h-fit sticky top-24"
    >
      <h3 className="font-mono text-sm text-foreground mb-4">Threat database</h3>
      
      <div className="space-y-1 mb-6">
        <p className="text-xs text-vanta-text-secondary">
          <span className="font-mono text-foreground">1,247</span> known scam addresses
        </p>
        <p className="text-xs text-vanta-text-muted">Updated 3h ago</p>
      </div>

      <div className="mb-6">
        <h4 className="text-xs text-vanta-text-muted mb-3">Recent additions</h4>
        <ul className="space-y-2">
          {recentAdditions.map((item, index) => (
            <li key={index} className="flex items-center justify-between text-xs">
              <span className="font-mono text-vanta-text-secondary">{item.address}</span>
              <span className="text-vanta-text-muted">{item.date}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs text-vanta-text-muted mb-2">Check an address</h4>
        <div className="flex gap-2">
          <Input
            placeholder="0x..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchResult(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted font-mono text-xs"
          />
          <button
            onClick={handleSearch}
            className="p-2 bg-vanta-elevated border border-border-hover rounded-lg text-vanta-text-muted hover:text-foreground transition-colors"
          >
            <Search size={16} />
          </button>
        </div>
        
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs",
                searchResult === "clean" 
                  ? "bg-vanta-teal/10 text-vanta-teal" 
                  : "bg-vanta-red/10 text-vanta-red"
              )}
            >
              {searchResult === "clean" ? (
                <>
                  <Check size={14} />
                  <span>Clean - not found in databases</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  <span>Flagged - known scam address</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function ScannerPage() {
  return (
    <DashboardLayout title="Scanner">
      <div className="space-y-4">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-6 py-4 bg-vanta-surface border border-border rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-foreground">AI Scanner</span>
            <PulsingDot />
            <span className="text-[13px] text-vanta-text-secondary">
              Active — scanning all transactions
            </span>
          </div>
          <span className="text-xs text-vanta-text-muted">
            Model: Claude Sonnet
          </span>
        </motion.div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Scan Log */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-vanta-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[13px] text-vanta-text-secondary">Scan log</h3>
            </div>
            <div>
              {mockScanEntries.map((entry) => (
                <ScanEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          </motion.div>

          {/* Threat Database Sidebar */}
          <ThreatDatabaseSidebar />
        </div>
      </div>
    </DashboardLayout>
  )
}
