'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface WorldIdState {
  verified: boolean;
  loading: boolean;
  verifying: boolean;
  error: string | null;
  credentialType: string | null;
  verifiedAt: string | null;
}

/**
 * Hook for World ID verification state.
 * Checks Supabase for existing verification, provides verify trigger.
 */
export function useWorldId(address?: string) {
  const [state, setState] = useState<WorldIdState>({
    verified: false,
    loading: true,
    verifying: false,
    error: null,
    credentialType: null,
    verifiedAt: null,
  });

  // Check if user is already verified
  const checkStatus = useCallback(async () => {
    if (!address) {
      setState((s) => ({ ...s, verified: false, loading: false }));
      return;
    }

    try {
      // Check nullifier table for this address
      const { data } = await supabase
        .from('world_id_nullifiers')
        .select('credential_type, verified_at')
        .eq('address', address.toLowerCase())
        .order('verified_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setState({
          verified: true,
          loading: false,
          verifying: false,
          error: null,
          credentialType: data.credential_type,
          verifiedAt: data.verified_at,
        });
      } else {
        setState((s) => ({ ...s, verified: false, loading: false }));
      }
    } catch {
      // Table may not exist yet or no rows — treat as unverified
      setState((s) => ({ ...s, verified: false, loading: false }));
    }
  }, [address]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Submit proof to backend for server-side verification
  const submitProof = useCallback(
    async (idkitResponse: unknown) => {
      if (!address) throw new Error('Wallet not connected');

      setState((s) => ({ ...s, verifying: true, error: null }));

      try {
        const res = await fetch('/api/worldid/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            address,
            idkitResponse,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Verification failed');
        }

        const result = await res.json();

        setState({
          verified: true,
          loading: false,
          verifying: false,
          error: null,
          credentialType: result.credential_types?.[0] ?? 'orb',
          verifiedAt: new Date().toISOString(),
        });

        return result;
      } catch (e) {
        const msg = (e as Error).message;
        setState((s) => ({
          ...s,
          verifying: false,
          error: msg,
        }));
        throw e;
      }
    },
    [address],
  );

  // Get RP signature from backend (for IDKit widget)
  const getRpContext = useCallback(async (action: string) => {
    const res = await fetch('/api/worldid/rp-signature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to get RP signature');
    }

    const rpSig = await res.json();

    return {
      rp_id: process.env.NEXT_PUBLIC_WORLD_RP_ID!,
      nonce: rpSig.nonce,
      created_at: rpSig.created_at,
      expires_at: rpSig.expires_at,
      signature: rpSig.sig,
    };
  }, []);

  return {
    ...state,
    checkStatus,
    submitProof,
    getRpContext,
  };
}
