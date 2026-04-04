'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  registerPasskey,
  getPasskeys,
  authenticatePasskeyMFA,
} from '@dynamic-labs-sdk/client';
import { getDynamicClient } from '@/lib/dynamic/client';

export interface PasskeyInfo {
  id: string;
  alias: string;
  createdAt: string;
}

/**
 * Passkey hook using Dynamic SDK's native passkey support.
 * Passkeys are stored on Dynamic's server and verified via WebAuthn.
 * Requires the user to be authenticated with Dynamic (wallet connected).
 */
export function usePasskey() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials;

  // Check if user has a Dynamic auth session (needed for passkey ops)
  const hasSession = useCallback(() => {
    const client = getDynamicClient();
    return !!client?.token;
  }, []);

  // Load passkeys from Dynamic
  const refresh = useCallback(async () => {
    if (!hasSession()) {
      setPasskeys([]);
      setRegistered(false);
      return;
    }

    try {
      const result = await getPasskeys();
      const mapped: PasskeyInfo[] = (result ?? []).map((p) => ({
        id: p.id,
        alias: p.alias || `Passkey`,
        createdAt: p.createdAt ? String(p.createdAt) : '',
      }));
      setPasskeys(mapped);
      setRegistered(mapped.length > 0);
    } catch {
      // User may not have a session yet — that's fine
      setPasskeys([]);
      setRegistered(false);
    }
  }, [hasSession]);

  // Load on mount & when client token changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Register a new passkey via Dynamic (triggers Face ID / Touch ID)
  const register = useCallback(async () => {
    if (!supported) {
      setError('WebAuthn is not supported in this browser');
      return false;
    }
    if (!hasSession()) {
      setError('Wallet not connected or session expired. Please reconnect.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await registerPasskey();
      // Refresh the list after registration
      await refresh();
      return true;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      if (msg.includes('cancelled') || msg.includes('abort') || msg.includes('NotAllowed')) {
        setError('Registration cancelled');
      } else if (msg.includes('not enabled') || msg.includes('MFA')) {
        setError('Passkey MFA not enabled. Enable it in your Dynamic dashboard under Security > MFA.');
      } else {
        setError(`Registration failed: ${msg}`);
      }
      console.error('Passkey registration failed:', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, hasSession, refresh]);

  // Verify with passkey via Dynamic (triggers biometric prompt + server verification)
  const verify = useCallback(async () => {
    if (!supported) {
      setError('WebAuthn is not supported');
      return false;
    }
    if (!hasSession()) {
      setError('Wallet not connected or session expired');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await authenticatePasskeyMFA();
      return true;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      if (msg.includes('cancelled') || msg.includes('abort') || msg.includes('NotAllowed')) {
        setError('Verification cancelled');
      } else {
        setError(`Verification failed: ${msg}`);
      }
      console.error('Passkey verification failed:', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, hasSession]);

  return {
    passkeys,
    registered,
    loading,
    supported,
    error,
    register,
    verify,
    refresh,
  };
}
