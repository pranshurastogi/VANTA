'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface DbTransaction {
  id: string;
  user_id: string;
  from_address: string;
  to_address: string;
  value: string;
  value_usd: number;
  calldata: string | null;
  chain_id: number;
  agent_id: string | null;
  tier: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'confirmed' | 'blocked' | 'rejected';
  matched_rules: string[];
  policy_reason: string | null;
  risk_score: number | null;
  scan_checks: { name: string; passed: boolean; detail: string }[];
  scan_recommendation: 'approve' | 'flag' | 'block' | null;
  scan_reasoning: string | null;
  tx_hash: string | null;
  confirmed_at: string | null;
  confirmed_method: string | null;
  created_at: string;
}

export function useRealtimeTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [pendingTx, setPendingTx] = useState<DbTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  const confirmTx = useCallback(async (txId: string, method = 'passkey') => {
    await fetch(`/api/transactions/confirm/${txId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    });
    setPendingTx(null);
  }, []);

  const rejectTx = useCallback(async (txId: string) => {
    await fetch(`/api/transactions/reject/${txId}`, { method: 'POST' });
    setPendingTx(null);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial load
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setTransactions((data as DbTransaction[]) ?? []);
        // Surface any existing pending tx
        const existing = (data as DbTransaction[])?.find((t) => t.status === 'pending');
        if (existing) setPendingTx(existing);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`transactions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = payload.new as DbTransaction;
            setTransactions((prev) => [newTx, ...prev]);
            if (newTx.status === 'pending') setPendingTx(newTx);
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as DbTransaction;
            setTransactions((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
            if (updated.status !== 'pending') {
              setPendingTx((prev) => (prev?.id === updated.id ? null : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { transactions, pendingTx, loading, confirmTx, rejectTx };
}
