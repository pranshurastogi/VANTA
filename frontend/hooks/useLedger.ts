'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface LedgerProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface LedgerState {
  connected: boolean;
  connecting: boolean;
  account: string | null;
  chainId: string | null;
  error: string | null;
  supported: boolean;
  providerFound: boolean;
  providerInfo: LedgerProviderInfo | null;
}

// EIP-1193 provider interface (minimal)
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
  isConnected(): boolean;
  disconnect?: (code?: number, message?: string) => Promise<void>;
}

// EIP-6963 provider detail
interface EIP6963ProviderDetail {
  info: LedgerProviderInfo;
  provider: EIP1193Provider;
}

// Ledger-specific EIP-6963 RDNS
const LEDGER_RDNS = 'com.ledger';

/**
 * Hook for Ledger Wallet Provider integration via EIP-6963.
 * Dynamically imports @ledgerhq/ledger-wallet-provider to avoid SSR issues.
 * Detects Web HID / Bluetooth API support in the browser.
 */
export function useLedger() {
  const [state, setState] = useState<LedgerState>({
    connected: false,
    connecting: false,
    account: null,
    chainId: null,
    error: null,
    supported: false,
    providerFound: false,
    providerInfo: null,
  });

  const providerRef = useRef<EIP1193Provider | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Check browser support for Web HID / Bluetooth (required by Ledger SDK)
  const checkSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const hasHID = 'hid' in navigator;
    const hasBluetooth = 'bluetooth' in navigator;
    return hasHID || hasBluetooth;
  }, []);

  // Handle EIP-6963 provider announcements — filter for Ledger
  const handleAnnounceProvider = useCallback((event: Event) => {
    const e = event as CustomEvent<EIP6963ProviderDetail>;
    const detail = e?.detail;
    if (!detail?.info || !detail?.provider) return;

    // Only accept Ledger's provider
    if (!detail.info.rdns?.includes(LEDGER_RDNS) && !detail.info.name?.toLowerCase().includes('ledger')) {
      return;
    }

    providerRef.current = detail.provider;

    setState((s) => ({
      ...s,
      providerFound: true,
      providerInfo: detail.info,
    }));

    // Attach provider event listeners
    detail.provider.on('accountsChanged', (accounts: unknown) => {
      const accs = accounts as string[];
      setState((s) => ({
        ...s,
        account: accs[0] ?? null,
        connected: accs.length > 0,
      }));
    });

    detail.provider.on('chainChanged', (chainId: unknown) => {
      setState((s) => ({ ...s, chainId: chainId as string }));
    });

    detail.provider.on('disconnect', () => {
      setState((s) => ({
        ...s,
        connected: false,
        account: null,
        chainId: null,
      }));
    });
  }, []);

  // Initialize the Ledger SDK (dynamic import for SSR safety)
  const initializeSdk = useCallback(async () => {
    const supported = checkSupport();
    setState((s) => ({ ...s, supported }));

    if (!supported) return;

    try {
      await import('@ledgerhq/ledger-wallet-provider/styles.css').catch(() => {
        // CSS import may fail in some bundler configs — non-fatal
      });

      const { initializeLedgerProvider } = await import('@ledgerhq/ledger-wallet-provider');

      const apiKey = process.env.NEXT_PUBLIC_LEDGER_API_KEY;
      const dAppIdentifier = process.env.NEXT_PUBLIC_LEDGER_DAPP_IDENTIFIER ?? 'vanta';

      const cleanup = initializeLedgerProvider({
        dAppIdentifier,
        ...(apiKey ? { apiKey } : {}),
        loggerLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        // In dev without API key, enable stubs so the UI still renders
        ...(!apiKey && process.env.NODE_ENV === 'development'
          ? {
              devConfig: {
                stub: {
                  base: true,
                  account: true,
                  balance: true,
                  device: true,
                  web3Provider: true,
                  dAppConfig: true,
                },
              },
            }
          : {}),
      });

      cleanupRef.current = cleanup;

      // Register listener before dispatching the request
      window.addEventListener('eip6963:announceProvider', handleAnnounceProvider);
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      setState((s) => ({ ...s, error: `Failed to load Ledger SDK: ${msg}` }));
    }
  }, [checkSupport, handleAnnounceProvider]);

  useEffect(() => {
    initializeSdk();

    return () => {
      cleanupRef.current?.();
      window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect: request accounts from the Ledger signer
  const connect = useCallback(async () => {
    if (!providerRef.current) {
      setState((s) => ({
        ...s,
        error: 'Ledger provider not found. Make sure the SDK initialized correctly.',
      }));
      return false;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const accounts = (await providerRef.current.request({
        method: 'eth_requestAccounts',
        params: [],
      })) as string[];

      const chainId = (await providerRef.current.request({
        method: 'eth_chainId',
        params: [],
      })) as string;

      setState((s) => ({
        ...s,
        connected: true,
        connecting: false,
        account: accounts[0] ?? null,
        chainId,
        error: null,
      }));

      return true;
    } catch (e) {
      const err = e as { code?: number; message?: string };
      let msg = err.message ?? 'Connection failed';

      if (err.code === 4001) msg = 'Connection rejected by user';
      else if (err.code === -32603) msg = 'Ledger is busy. Please wait and try again.';
      else if (err.code === 4900) msg = 'Ledger provider is disconnected';

      setState((s) => ({ ...s, connecting: false, error: msg }));
      return false;
    }
  }, []);

  // Disconnect from the Ledger signer
  const disconnect = useCallback(async () => {
    if (!providerRef.current) return;

    try {
      if (typeof providerRef.current.disconnect === 'function') {
        await providerRef.current.disconnect(1000, 'User disconnected');
      }
    } catch {
      // Best-effort disconnect
    }

    setState((s) => ({
      ...s,
      connected: false,
      account: null,
      chainId: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    provider: providerRef.current,
  };
}
