'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface DbRule {
  id: string;
  user_id: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export function useRules(userId: string | undefined) {
  const [rules, setRules] = useState<DbRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order')
      .then(({ data }) => {
        setRules((data as DbRule[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  const toggleRule = useCallback(async (ruleId: string, enabled: boolean) => {
    await supabase.from('rules').update({ enabled }).eq('id', ruleId);
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
  }, []);

  const updateConfig = useCallback(async (ruleId: string, config: Record<string, unknown>) => {
    await supabase.from('rules').update({ config }).eq('id', ruleId);
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, config } : r)));
  }, []);

  const addRule = useCallback(async (
    type: string,
    config: Record<string, unknown> = {},
    userId_: string
  ) => {
    const maxOrder = rules.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { data, error } = await supabase
      .from('rules')
      .insert({ user_id: userId_, type, config, enabled: true, sort_order: maxOrder + 1 })
      .select('*')
      .single();
    if (!error && data) {
      setRules((prev) => [...prev, data as DbRule]);
      return data as DbRule;
    }
    return null;
  }, [rules]);

  const deleteRule = useCallback(async (ruleId: string) => {
    await supabase.from('rules').delete().eq('id', ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const reorder = useCallback(async (orderedIds: string[]) => {
    setRules((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, sort_order: i }));
    });
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('rules').update({ sort_order: i }).eq('id', orderedIds[i]);
    }
  }, []);

  return { rules, loading, toggleRule, updateConfig, addRule, deleteRule, reorder };
}
