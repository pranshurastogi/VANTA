'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Usb,
  Bluetooth,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Unplug,
  MonitorSmartphone,
  Info,
  Wallet,
} from 'lucide-react';
import { InfinityLoader } from '@/components/ui/loader-13';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/vanta/status-badge';
import { useLedger } from '@/hooks/useLedger';
import { cn } from '@/lib/utils';

interface LedgerGateProps {
  /** Called after a successful connection */
  onConnected?: (account: string) => void;
}

/**
 * Ledger Wallet Provider integration component.
 * Initializes @ledgerhq/ledger-wallet-provider via EIP-6963, discovers the
 * Ledger signer, and lets the user connect their hardware wallet from settings.
 */
export function LedgerGate({ onConnected }: LedgerGateProps) {
  const {
    connected,
    connecting,
    account,
    chainId,
    error,
    supported,
    providerFound,
    providerInfo,
    connect,
    disconnect,
  } = useLedger();

  const hasApiKey = !!process.env.NEXT_PUBLIC_LEDGER_API_KEY;
  const isDev = process.env.NODE_ENV === 'development';

  const handleConnect = async () => {
    const ok = await connect();
    if (ok && account) {
      onConnected?.(account);
    }
  };

  // ── Not supported (no Web HID / Bluetooth) ──────────────────────────────
  if (!supported) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-vanta-amber/5 border border-vanta-amber/20 rounded-lg">
          <AlertTriangle size={18} className="text-vanta-amber shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Browser not supported</p>
            <p className="text-xs text-vanta-text-muted mt-1">
              Ledger requires Web HID (USB) or Web Bluetooth support. Use Chrome, Edge, or
              Brave on desktop. Mobile browsers are not supported.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-vanta-text-muted">
          <div className="flex items-center gap-1.5">
            <Usb size={12} />
            <span>Web HID — Chrome 89+, Edge 89+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bluetooth size={12} />
            <span>Web Bluetooth — Chrome 56+</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────────
  if (connected && account) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-vanta-teal/5 border border-vanta-teal/20 rounded-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 rounded-lg bg-vanta-teal/10 flex items-center justify-center shrink-0"
          >
            <ShieldCheck size={20} className="text-vanta-teal" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-foreground font-medium">Ledger signer connected</span>
              <StatusBadge variant="safe">Active</StatusBadge>
            </div>
            <p className="text-xs text-vanta-text-muted mt-0.5 font-mono truncate">{account}</p>
            {chainId && (
              <p className="text-[10px] text-vanta-text-muted mt-0.5">
                Chain ID: {parseInt(chainId, 16)}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="border-border text-vanta-text-muted hover:border-vanta-red hover:text-vanta-red shrink-0"
          >
            <Unplug size={12} className="mr-1.5" />
            Disconnect
          </Button>
        </motion.div>

        <div className="flex items-center gap-2 text-xs text-vanta-text-muted">
          <CheckCircle size={12} className="text-vanta-teal" />
          Your Ledger signer is ready to confirm Tier 2 &amp; Tier 3 transactions.
        </div>
      </div>
    );
  }

  // ── Default / connect flow ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={providerFound ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300',
            providerFound ? 'bg-vanta-teal/10' : 'bg-vanta-elevated'
          )}
        >
          <Wallet
            size={20}
            className={cn(
              'transition-colors duration-300',
              providerFound ? 'text-vanta-teal' : 'text-vanta-text-muted'
            )}
          />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {providerFound ? 'Ledger provider detected' : 'No Ledger signer connected'}
            </span>
            <AnimatePresence>
              {providerFound && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <StatusBadge variant="safe">Ready</StatusBadge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-vanta-text-muted mt-0.5">
            {providerFound
              ? `${providerInfo?.name ?? 'Ledger Wallet'} — click Connect to select your account`
              : 'Connect your Ledger device via USB or Bluetooth to enable hardware signing'}
          </p>
        </div>

        <Button
          onClick={handleConnect}
          disabled={connecting || !providerFound}
          className={cn(
            'shrink-0 transition-all',
            providerFound
              ? 'bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90'
              : 'bg-vanta-elevated text-vanta-text-muted cursor-not-allowed'
          )}
        >
          {connecting ? (
            <>
              <InfinityLoader size={14} className="mr-2" />
              Connecting…
            </>
          ) : (
            <>
              <Usb size={14} className="mr-2" />
              Connect
            </>
          )}
        </Button>
      </div>

      {/* Error feedback */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-xs text-vanta-red flex items-start gap-2"
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Dev mode notice when API key is missing */}
        {isDev && !hasApiKey && !error && (
          <motion.div
            key="dev-notice"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 bg-vanta-amber/5 border border-vanta-amber/20 rounded-lg text-xs text-vanta-amber flex items-start gap-2"
          >
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              Running in stub/dev mode — no Ledger API key found.{' '}
              Add <code className="font-mono">NEXT_PUBLIC_LEDGER_API_KEY</code> and{' '}
              <code className="font-mono">NEXT_PUBLIC_LEDGER_DAPP_IDENTIFIER</code> to{' '}
              <code className="font-mono">.env.local</code> for production use.
            </span>
          </motion.div>
        )}

        {/* Production notice when API key is missing */}
        {!isDev && !hasApiKey && !error && (
          <motion.div
            key="prod-notice"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 bg-vanta-amber/5 border border-vanta-amber/20 rounded-lg text-xs text-vanta-amber flex items-start gap-2"
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Ledger API key not configured.{' '}
              Set <code className="font-mono">NEXT_PUBLIC_LEDGER_API_KEY</code> in your environment
              variables. Enroll at{' '}
              <a
                href="https://developers.ledger.com/docs/ledger-wallet-provider/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ledger&apos;s partner program
              </a>
              .
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!providerFound && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2 pt-1"
        >
          <p className="text-xs text-vanta-text-secondary font-medium">How to connect</p>
          <ol className="space-y-1.5 text-xs text-vanta-text-muted list-none">
            {[
              { icon: Usb, text: 'Plug in your Ledger via USB (or pair via Bluetooth)' },
              { icon: MonitorSmartphone, text: 'Unlock your Ledger and open the Ethereum app' },
              { icon: Wallet, text: 'Click Connect above — the Ledger UI will appear to select your account' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-vanta-elevated text-[10px] font-medium flex items-center justify-center shrink-0 mt-0.5 text-vanta-text-secondary">
                  {i + 1}
                </span>
                <div className="flex items-start gap-1.5">
                  <Icon size={12} className="shrink-0 mt-0.5 text-vanta-text-muted" />
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </div>
  );
}
