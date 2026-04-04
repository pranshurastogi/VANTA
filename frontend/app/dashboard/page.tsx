"use client"

import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { HeroStatusCard } from "@/components/vanta/dashboard/hero-status-card"
import { TierBreakdownCard } from "@/components/vanta/dashboard/tier-breakdown-card"
import { ActiveRulesCard } from "@/components/vanta/dashboard/active-rules-card"
import { AgentStatusCard } from "@/components/vanta/dashboard/agent-status-card"
import { RecentActivityCard } from "@/components/vanta/dashboard/recent-activity-card"
import { ConfirmationModal } from "@/components/vanta/confirmation-modal"
import { useUser } from "@/hooks/useUser"
import { useRealtimeTransactions } from "@/hooks/useRealtimeTransactions"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import type { Transaction } from "@/lib/types"

function dbTxToUiTx(tx: ReturnType<typeof useRealtimeTransactions>["transactions"][number]): Transaction {
  const eth = Number(tx.value) / 1e18
  const usd = tx.value_usd ?? eth * 2400
  const statusMap: Record<string, Transaction["status"]> = {
    approved: "approved",
    confirmed: "confirmed",
    blocked: "blocked",
    rejected: "blocked",
    pending: "confirmed",
  }
  const tierMap: Record<number, Transaction["tier"]> = {
    1: "auto",
    2: "confirmed",
    3: "blocked",
  }

  return {
    id: tx.id,
    status: statusMap[tx.status] ?? "approved",
    description: tx.calldata ? `Contract call → ${tx.to_address.slice(0, 8)}…` : `Transfer → ${tx.to_address.slice(0, 8)}…`,
    agent: tx.agent_id ? "AI Agent" : "Manual",
    amount: `$${usd.toFixed(2)}`,
    amountUsd: usd,
    time: new Date(tx.created_at).toLocaleTimeString(),
    tier: tierMap[tx.tier] ?? "auto",
    to: tx.to_address,
    from: tx.from_address,
    network: tx.chain_id === 11155111 ? "Sepolia" : tx.chain_id === 1 ? "Ethereum Mainnet" : `Chain ${tx.chain_id}`,
    aiAssessment: tx.risk_score != null ? {
      riskScore: tx.risk_score,
      riskLevel: tx.risk_score < 30 ? "low" : tx.risk_score < 70 ? "medium" : "high",
      checks: (tx.scan_checks ?? []).map((c) => ({ label: c.detail, passed: c.passed })),
    } : undefined,
  }
}

export default function DashboardPage() {
  const { user } = useUser()
  const stats = useDashboardStats(user?.id)
  const { transactions, pendingTx, confirmTx, rejectTx } = useRealtimeTransactions(user?.id)

  const uiTxs = transactions.slice(0, 10).map(dbTxToUiTx)

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        <HeroStatusCard
          volumeProtected={stats.volumeProtected}
          threatsBlocked={stats.threatsBlocked}
          autoApproved={stats.autoApproved}
          agentsConnected={2}
          lastScan={transactions[0] ? `${Math.round((Date.now() - new Date(transactions[0].created_at).getTime()) / 1000)}s ago` : "No activity"}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TierBreakdownCard
            tier1Count={stats.tier1Count}
            tier2Count={stats.tier2Count}
            tier3Count={stats.tier3Count}
          />
          <ActiveRulesCard />
          <AgentStatusCard />
        </div>

        <RecentActivityCard transactions={uiTxs} />
      </div>

      {/* Realtime confirmation modal — appears when an agent submits a Tier 2 transaction */}
      <ConfirmationModal
        isOpen={!!pendingTx}
        onClose={() => rejectTx(pendingTx!.id)}
        onConfirm={() => confirmTx(pendingTx!.id)}
        onReject={() => rejectTx(pendingTx!.id)}
        transaction={pendingTx ? {
          type: pendingTx.calldata ? "Contract call" : "Transfer",
          amount: `${(Number(pendingTx.value) / 1e18).toFixed(4)} ETH`,
          amountUsd: `$${(pendingTx.value_usd ?? 0).toFixed(2)}`,
          to: pendingTx.to_address,
          isNewAddress: true,
          riskLevel: (pendingTx.risk_score ?? 0) < 30 ? "low" : (pendingTx.risk_score ?? 0) < 70 ? "medium" : "high",
          riskReasons: pendingTx.policy_reason ? [pendingTx.policy_reason] : [],
          gas: "~$2.00",
          network: pendingTx.chain_id === 11155111 ? "Sepolia" : pendingTx.chain_id === 1 ? "Ethereum Mainnet" : `Chain ${pendingTx.chain_id}`,
          agent: pendingTx.agent_id ? "AI Agent" : "Manual",
          aiChecks: {
            passed: (pendingTx.scan_checks ?? []).filter((c) => c.passed).length,
            warnings: (pendingTx.scan_checks ?? []).filter((c) => !c.passed).length,
          },
          warningDetail: pendingTx.scan_reasoning ?? undefined,
        } : undefined}
      />
    </DashboardLayout>
  )
}
