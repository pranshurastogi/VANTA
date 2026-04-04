'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface DashboardStats {
  volumeProtected: number;
  threatsBlocked: number;
  autoApproved: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  pendingCount: number;
  loading: boolean;
}

export function useDashboardStats(userId: string | undefined): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    volumeProtected: 0,
    threatsBlocked: 0,
    autoApproved: 0,
    tier1Count: 0,
    tier2Count: 0,
    tier3Count: 0,
    pendingCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('transactions')
      .select('status, tier, value_usd')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .then(({ data: txs }) => {
        if (!txs) return;
        setStats({
          volumeProtected: txs.reduce((sum, t) => sum + (Number(t.value_usd) || 0), 0),
          threatsBlocked: txs.filter((t) => t.status === 'blocked').length,
          autoApproved: txs.filter((t) => t.status === 'approved' && t.tier === 1).length,
          tier1Count: txs.filter((t) => t.tier === 1).length,
          tier2Count: txs.filter((t) => t.tier === 2).length,
          tier3Count: txs.filter((t) => t.tier === 3).length,
          pendingCount: txs.filter((t) => t.status === 'pending').length,
          loading: false,
        });
      });
  }, [userId]);

  return stats;
}
