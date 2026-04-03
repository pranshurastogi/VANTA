"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/vanta/dashboard-layout"
import { HeroStatusCard } from "@/components/vanta/dashboard/hero-status-card"
import { TierBreakdownCard } from "@/components/vanta/dashboard/tier-breakdown-card"
import { ActiveRulesCard } from "@/components/vanta/dashboard/active-rules-card"
import { AgentStatusCard } from "@/components/vanta/dashboard/agent-status-card"
import { RecentActivityCard } from "@/components/vanta/dashboard/recent-activity-card"
import { ConfirmationModal } from "@/components/vanta/confirmation-modal"
import { Button } from "@/components/ui/button"
import { mockTransactions, dashboardStats } from "@/lib/mock-data"

export default function DashboardPage() {
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        {/* Hero Status Card */}
        <HeroStatusCard
          volumeProtected={dashboardStats.volumeProtected}
          threatsBlocked={dashboardStats.threatsBlocked}
          autoApproved={dashboardStats.autoApproved}
          agentsConnected={2}
          lastScan="12 seconds ago"
        />

        {/* Three Column Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TierBreakdownCard
            tier1Count={dashboardStats.tier1Count}
            tier2Count={dashboardStats.tier2Count}
            tier3Count={dashboardStats.tier3Count}
          />
          <ActiveRulesCard />
          <AgentStatusCard />
        </div>

        {/* Recent Activity */}
        <RecentActivityCard transactions={mockTransactions} />

        {/* Demo Button for Confirmation Modal */}
        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => setShowConfirmModal(true)}
            variant="outline"
            className="border-vanta-amber text-vanta-amber hover:bg-vanta-amber/10"
          >
            Demo: Trigger Confirmation Modal
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => setShowConfirmModal(false)}
        onReject={() => setShowConfirmModal(false)}
      />
    </DashboardLayout>
  )
}
