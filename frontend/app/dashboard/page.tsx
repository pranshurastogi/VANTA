"use client"

import { useState, useCallback } from "react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { HeroStatusCard } from "@/components/vanta/dashboard/hero-status-card"
import { StatTiles } from "@/components/vanta/dashboard/stat-tiles"
import { TierBreakdownCard } from "@/components/vanta/dashboard/tier-breakdown-card"
import { ActiveRulesCard } from "@/components/vanta/dashboard/active-rules-card"
import { AgentStatusCard } from "@/components/vanta/dashboard/agent-status-card"
import { RecentActivityCard } from "@/components/vanta/dashboard/recent-activity-card"
import { ConfirmationModal } from "@/components/vanta/confirmation-modal"
import { SetupChecklist } from "@/components/vanta/dashboard/setup-checklist"
import { useUser } from "@/hooks/useUser"
import { useRules } from "@/hooks/useRules"
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
    description: tx.calldata
      ? `Contract call → ${tx.to_address.slice(0, 8)}…`
      : `Transfer → ${tx.to_address.slice(0, 8)}…`,
    agent: tx.agent_id ? "AI Agent" : "Manual",
    amount: `$${usd.toFixed(2)}`,
    amountUsd: usd,
    time: new Date(tx.created_at).toLocaleTimeString(),
    tier: tierMap[tx.tier] ?? "auto",
    to: tx.to_address,
    from: tx.from_address,
    network:
      tx.chain_id === 11155111
        ? "Sepolia"
        : tx.chain_id === 1
        ? "Ethereum Mainnet"
        : `Chain ${tx.chain_id}`,
    aiAssessment:
      tx.risk_score != null
        ? {
            riskScore: tx.risk_score,
            riskLevel:
              tx.risk_score < 30 ? "low" : tx.risk_score < 70 ? "medium" : "high",
            checks: (tx.scan_checks ?? []).map((c) => ({
              label: c.detail,
              passed: c.passed,
            })),
          }
        : undefined,
  }
}

export default function DashboardPage() {
  const { user } = useUser()
  const { rules } = useRules(user?.id)
  const stats = useDashboardStats(user?.id)
  const { transactions, pendingTx, confirmTx, rejectTx } = useRealtimeTransactions(user?.id)
  const confirmationMethod = user?.confirmation_method ?? "passkey"
  const [showModal, setShowModal] = useState(false)

  const uiTxs = transactions.slice(0, 10).map(dbTxToUiTx)
  const pendingCount = transactions.filter((t) => t.status === "pending").length

  const lastScan = transactions[0]
    ? `${Math.round((Date.now() - new Date(transactions[0].created_at).getTime()) / 1000)}s ago`
    : "No activity"

  const handleBellClick = useCallback(() => {
    if (pendingTx) setShowModal(true)
  }, [pendingTx])

  const isModalOpen = showModal || !!pendingTx

  const handleConfirm = useCallback(() => {
    if (pendingTx) confirmTx(pendingTx.id, confirmationMethod)
  }, [pendingTx, confirmTx, confirmationMethod])

  const handleReject = useCallback(() => {
    if (pendingTx) {
      rejectTx(pendingTx.id)
      setShowModal(false)
    }
  }, [pendingTx, rejectTx])

  const handleClose = useCallback(() => setShowModal(false), [])

  return (
    <DashboardLayout
      title="Dashboard"
      pendingCount={pendingCount}
      onBellClick={handleBellClick}
    >
      <div className="space-y-4">
        {/* Setup walkthrough — hidden once complete */}
        <SetupChecklist
          user={user}
          rulesCount={rules.length}
          hasTransactions={transactions.length > 0}
        />

        {/* 7-day stacked area chart */}
        <HeroStatusCard
          agentsConnected={2}
          lastScan={lastScan}
          tier1Count={stats.tier1Count}
          tier2Count={stats.tier2Count}
          tier3Count={stats.tier3Count}
        />

        {/* 4 animated metric tiles */}
        <StatTiles
          volumeProtected={stats.volumeProtected}
          threatsBlocked={stats.threatsBlocked}
          autoApproved={stats.autoApproved}
          pendingCount={pendingCount}
        />

        {/* Secondary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TierBreakdownCard
            tier1Count={stats.tier1Count}
            tier2Count={stats.tier2Count}
            tier3Count={stats.tier3Count}
          />
          <ActiveRulesCard />
          <AgentStatusCard />
        </div>

        {/* Recent activity feed */}
        <RecentActivityCard transactions={uiTxs} />
      </div>

      {/* Realtime confirmation modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onReject={handleReject}
        walletAddress={user?.address}
        confirmationMethod={confirmationMethod}
        worldIdRequired={pendingTx?.tier === 3}
        transaction={
          pendingTx
            ? {
                id: pendingTx.id,
                type: pendingTx.calldata ? "Contract call" : "Transfer",
                amount: `${(Number(pendingTx.value) / 1e18).toFixed(4)} ETH`,
                amountUsd: `$${(pendingTx.value_usd ?? 0).toFixed(2)}`,
                to: `${pendingTx.to_address.slice(0, 6)}...${pendingTx.to_address.slice(-4)}`,
                toFull: pendingTx.to_address,
                fromFull: pendingTx.from_address,
                isNewAddress: true,
                riskLevel:
                  (pendingTx.risk_score ?? 0) < 30
                    ? "low"
                    : (pendingTx.risk_score ?? 0) < 70
                    ? "medium"
                    : "high",
                riskReasons: pendingTx.policy_reason ? [pendingTx.policy_reason] : [],
                gas: "~$2.00",
                network:
                  pendingTx.chain_id === 11155111
                    ? "Sepolia"
                    : pendingTx.chain_id === 1
                    ? "Ethereum Mainnet"
                    : `Chain ${pendingTx.chain_id}`,
                agent: pendingTx.agent_id ? "AI Agent" : "Manual",
                tier: pendingTx.tier,
                chainId: pendingTx.chain_id,
                txHash: pendingTx.tx_hash,
                value: pendingTx.value,
                aiChecks: {
                  passed: (pendingTx.scan_checks ?? []).filter((c) => c.passed).length,
                  warnings: (pendingTx.scan_checks ?? []).filter((c) => !c.passed).length,
                },
                warningDetail: pendingTx.scan_reasoning ?? undefined,
              }
            : undefined
        }
      />
    </DashboardLayout>
  )
}
