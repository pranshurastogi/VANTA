'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDynamic } from '@/lib/dynamic/context';

export interface VantaUser {
  id: string;
  address: string;
  protection_level: string;
  world_id_verified: boolean;
  ens_name: string | null;
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

        // User not found (PGRST116) — auto-register
        if (error?.code === 'PGRST116' || !data) {
          try {
            const res = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address, protectionLevel: 'balanced' }),
            });
            if (res.ok) {
              const { userId } = await res.json();
              const { data: newUser } = await supabase
                .from('users')
                .select('id, address, protection_level, world_id_verified, ens_name')
                .eq('id', userId)
                .single();
              setUser(newUser as VantaUser | null);
            }
          } catch {
            // non-fatal
          }
        }
        setLoading(false);
      });
  }, [wallet?.address]);

  return { user, loading };
}
