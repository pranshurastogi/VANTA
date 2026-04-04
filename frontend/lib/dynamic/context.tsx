'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  getWalletAccounts,
  getPrimaryWalletAccount,
  logout,
  onEvent,
  getActiveNetworkId,
  switchActiveNetwork,
  type WalletAccount,
} from '@dynamic-labs-sdk/client';
import { getDynamicClient } from './client';

export const SEPOLIA_NETWORK_ID = '11155111';

export interface DynamicState {
  wallet: WalletAccount | null;
  isConnected: boolean;
  isReady: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  showConnectModal: boolean;
  setShowConnectModal: (v: boolean) => void;
}

const DynamicContext = createContext<DynamicState>({
  wallet: null,
  isConnected: false,
  isReady: false,
  connect: () => {},
  disconnect: async () => {},
  showConnectModal: false,
  setShowConnectModal: () => {},
});

export function DynamicProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const client = getDynamicClient();
    if (!client) {
      setIsReady(true);
      return;
    }

    // Hydrate initial wallet state (synchronous)
    const accounts = getWalletAccounts();
    const primary = getPrimaryWalletAccount() ?? accounts[0] ?? null;
    setWallet(primary);
    setIsReady(true);

    if (primary) {
      ensureSepolia(primary);
      registerUser(primary.address);
    }

    // Subscribe to wallet account changes
    const unsubscribe = onEvent(
      {
        event: 'walletAccountsChanged',
        listener: ({ walletAccounts }) => {
          const next = walletAccounts[0] ?? null;
          setWallet(next);
          if (next) {
            ensureSepolia(next);
            registerUser(next.address);
          }
        },
      },
      client,
    );

    return unsubscribe;
  }, []);

  const connect = useCallback(() => setShowConnectModal(true), []);

  const disconnect = useCallback(async () => {
    await logout();
    setWallet(null);
  }, []);

  return (
    <DynamicContext.Provider
      value={{
        wallet,
        isConnected: !!wallet,
        isReady,
        connect,
        disconnect,
        showConnectModal,
        setShowConnectModal,
      }}
    >
      {children}
    </DynamicContext.Provider>
  );
}

export const useDynamic = () => useContext(DynamicContext);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function ensureSepolia(walletAccount: WalletAccount) {
  try {
    const { networkId } = await getActiveNetworkId({ walletAccount });
    if (networkId !== SEPOLIA_NETWORK_ID) {
      await switchActiveNetwork({ networkId: SEPOLIA_NETWORK_ID, walletAccount });
    }
  } catch {
    // Wallet may not support programmatic network switching — silently fail
  }
}

async function registerUser(address: string) {
  try {
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
  } catch {
    // non-fatal
  }
}
