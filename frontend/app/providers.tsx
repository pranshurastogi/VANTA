'use client';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
        walletConnectors: [EthereumWalletConnectors],
        eventsCallbacks: {
          onAuthSuccess: async (args) => {
            await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: args.primaryWallet?.address,
                dynamicUserId: args.user?.userId,
              }),
            });
          },
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
