export type TransactionStatus = "approved" | "confirmed" | "blocked"
export type TransactionTier = "auto" | "confirmed" | "blocked"
export type RiskLevel = "low" | "medium" | "high"

export interface Transaction {
  id: string
  status: TransactionStatus
  description: string
  agent: string
  amount: string
  amountUsd: number
  time: string
  tier: TransactionTier
  to?: string
  from?: string
  network?: string
  gas?: string
  contractVerified?: boolean
  aiAssessment?: AIAssessment
}

export interface AIAssessment {
  riskScore: number
  riskLevel: RiskLevel
  checks: AICheck[]
}

export interface AICheck {
  label: string
  passed: boolean
  detail?: string
}

export interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  type: "limit" | "whitelist" | "block" | "time" | "custom"
  config?: Record<string, unknown>
}

export interface Agent {
  id: string
  name: string
  ens?: string
  active: boolean
  txnsToday: number
  volumeToday: number
  blocked: number
  permissions: AgentPermission[]
}

export interface AgentPermission {
  name: string
  allowed: boolean
}

export interface ScanEntry {
  id: string
  time: string
  result: "passed" | "flagged" | "blocked"
  description: string
  score: number
  checks?: AICheck[]
}

export interface ScanHistoryEntry {
  id: string
  user_address: string | null
  from_address: string
  to_address: string
  value: string
  value_usd: number | null
  calldata: string | null
  chain_id: number
  agent_id: string | null
  risk_score: number
  recommendation: "approve" | "flag" | "block"
  reasoning: string
  checks: { name: string; passed: boolean; detail: string }[]
  model: string
  scan_source: "manual" | "auto" | "api"
  ip_address: string | null
  created_at: string
}
