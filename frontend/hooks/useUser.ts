'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDynamic } from '@/lib/dynamic/context';

export type ConfirmationMethod = 'passkey' | 'worldid' | 'ledger' | 'manual';

export interface VantaUser {
  id: string;
  address: string;
  protection_level: string;
  world_id_verified: boolean;
  ens_name: string | null;
  email: string | null;
  confirmation_method: ConfirmationMethod;
  tier3_escalation: string | null;
}

const BASE_COLUMNS = 'id, address, protection_level, world_id_verified, ens_name';
const EXTENDED_COLUMNS = `${BASE_COLUMNS}, email, confirmation_method, tier3_escalation`;

function normalizeUser(data: Record<string, unknown>): VantaUser {
  return {
    id: data.id as string,
    address: data.address as string,
    protection_level: (data.protection_level as string) ?? 'balanced',
    world_id_verified: (data.world_id_verified as boolean) ?? false,
    ens_name: (data.ens_name as string) ?? null,
    email: (data.email as string) ?? null,
    confirmation_method: (data.confirmation_method as ConfirmationMethod) ?? 'passkey',
    tier3_escalation: (data.tier3_escalation as string) ?? null,
  };
}

async function fetchUser(column: string, value: string): Promise<VantaUser | null> {
  // Try with extended columns first; fall back to base if columns don't exist yet
  const { data, error } = await supabase
    .from('users')
    .select(EXTENDED_COLUMNS)
    .eq(column, value)
    .single();

  if (data) return normalizeUser(data as Record<string, unknown>);

  // If error is about unknown column, retry with base columns
  if (error && error.message?.includes('column')) {
    const { data: fallback } = await supabase
      .from('users')
      .select(BASE_COLUMNS)
      .eq(column, value)
      .single();
    if (fallback) return normalizeUser(fallback as Record<string, unknown>);
  }

  return null;
}

export function useUser() {
  const { wallet } = useDynamic();
  const [user, setUser] = useState<VantaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const address = wallet?.address;
    if (!address) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchUser('address', address.toLowerCase()).then(async (found) => {
      if (found) {
        setUser(found);
        setLoading(false);
        return;
      }

      // User not found — auto-register
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, protectionLevel: 'balanced' }),
        });
        if (res.ok) {
          const { userId } = await res.json();
          const newUser = await fetchUser('id', userId);
          setUser(newUser);
        }
      } catch {
        // non-fatal
      }
      setLoading(false);
    });
  }, [wallet?.address]);

  const updateSettings = useCallback(async (updates: Partial<Pick<VantaUser, 'confirmation_method' | 'tier3_escalation' | 'protection_level' | 'email'>>) => {
    if (!user) return;
    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: user.address, ...updates }),
      });
      setUser((prev) => prev ? { ...prev, ...updates } : prev);
    } catch {
      // non-fatal
    }
  }, [user]);

  return { user, loading, updateSettings };
}
