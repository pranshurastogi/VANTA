'use client';
import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { supabase } from '@/lib/supabase/client';

export interface VantaUser {
  id: string;
  address: string;
  protection_level: string;
  world_id_verified: boolean;
  ens_name: string | null;
}

export function useUser() {
  const { primaryWallet } = useDynamicContext();
  const [user, setUser] = useState<VantaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const address = primaryWallet?.address;
    if (!address) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from('users')
      .select('id, address, protection_level, world_id_verified, ens_name')
      .eq('address', address.toLowerCase())
      .single()
      .then(async ({ data, error }) => {
        if (data) {
          setUser(data as VantaUser);
          setLoading(false);
          return;
        }

        // User not found (PGRST116 = no rows) — auto-register
        if (error?.code === 'PGRST116' || !data) {
          try {
            const res = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address, protectionLevel: 'balanced' }),
            });
            if (res.ok) {
              const { userId } = await res.json();
              // Re-fetch the full user record
              const { data: newUser } = await supabase
                .from('users')
                .select('id, address, protection_level, world_id_verified, ens_name')
                .eq('id', userId)
                .single();
              setUser(newUser as VantaUser | null);
            }
          } catch {
            // silently fail — user stays null
          }
        }
        setLoading(false);
      });
  }, [primaryWallet?.address]);

  return { user, loading };
}
