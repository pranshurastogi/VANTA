'use client';
import { DynamicProvider } from '@/lib/dynamic/context';
import { WalletConnectModal } from '@/components/vanta/wallet-connect-modal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicProvider>
      {children}
      <WalletConnectModal />
    </DynamicProvider>
  );
}
