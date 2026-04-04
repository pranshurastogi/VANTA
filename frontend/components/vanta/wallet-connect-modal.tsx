'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2, ChevronLeft, ArrowRight, Wallet } from 'lucide-react';
import {
  getAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider,
  sendEmailOTP,
  verifyOTP,
  type WalletProviderData,
  type OTPVerification,
} from '@dynamic-labs-sdk/client';
import {
  getChainsMissingWaasWalletAccounts,
  createWaasWalletAccounts,
} from '@dynamic-labs-sdk/client/waas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VantaLogo } from './logo';
import { useDynamic } from '@/lib/dynamic/context';
import { cn } from '@/lib/utils';

type Flow = 'providers' | 'email' | 'otp';

export function WalletConnectModal() {
  const { showConnectModal, setShowConnectModal, refreshWallet } = useDynamic();

  const [flow, setFlow] = useState<Flow>('providers');
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerification, setOtpVerification] = useState<OTPVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showConnectModal) return;
    setFlow('providers');
    setError('');
    setEmail('');
    setOtp('');

    // getAvailableWalletProvidersData is synchronous
    const data = getAvailableWalletProvidersData();
    // Deduplicate by groupKey
    const seen = new Set<string>();
    const unique = data.filter((p) => {
      if (seen.has(p.groupKey)) return false;
      seen.add(p.groupKey);
      return true;
    });
    setProviders(unique);
  }, [showConnectModal]);

  const close = () => setShowConnectModal(false);

  async function handleSelectProvider(providerKey: string) {
    setLoading(true);
    setError('');
    try {
      // connectAndVerifyWithWalletProvider takes { walletProviderKey }
      await connectAndVerifyWithWalletProvider({ walletProviderKey: providerKey });
      // Create WaaS wallet accounts if any chains are missing (call unconditionally)
      const missing = getChainsMissingWaasWalletAccounts();
      if (missing.length > 0) {
        await createWaasWalletAccounts({ chains: missing });
      }
      // Manually refresh wallet state so the UI updates immediately
      refreshWallet();
      close();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOTP() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      // sendEmailOTP returns OTPVerification directly (not { otpVerification })
      const verification = await sendEmailOTP({ email: email.trim() });
      setOtpVerification(verification);
      setFlow('otp');
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (otp.length !== 6 || !otpVerification) return;
    setLoading(true);
    setError('');
    try {
      await verifyOTP({ otpVerification, verificationToken: otp });
      // Create WaaS wallet accounts unconditionally (SDK may have stale account list)
      const missing = getChainsMissingWaasWalletAccounts();
      if (missing.length > 0) {
        await createWaasWalletAccounts({ chains: missing });
      }
      // Manually refresh wallet state so the UI updates immediately
      refreshWallet();
      close();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isEmailProvider = (p: WalletProviderData) =>
    p.groupKey?.toLowerCase().includes('email') ||
    p.key?.toLowerCase().includes('email') ||
    p.metadata?.displayName?.toLowerCase().includes('email');

  const externalProviders = providers.filter((p) => !isEmailProvider(p));
  const hasEmail = providers.some(isEmailProvider);

  return (
    <AnimatePresence>
      {showConnectModal && (
        <motion.div
          key="connect-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-[360px] bg-vanta-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                {flow !== 'providers' && (
                  <button
                    onClick={() => setFlow(flow === 'otp' ? 'email' : 'providers')}
                    className="text-vanta-text-muted hover:text-foreground transition-colors mr-1"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <VantaLogo size={20} />
                <span className="font-mono text-sm text-foreground">
                  {flow === 'providers' ? 'Connect wallet' : flow === 'email' ? 'Email login' : 'Enter code'}
                </span>
              </div>
              <button
                onClick={close}
                className="text-vanta-text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-vanta-elevated"
              >
                <X size={16} />
              </button>
            </div>

            {/* Network badge */}
            <div className="flex items-center gap-1.5 px-5 py-2 bg-vanta-elevated/50 border-b border-border">
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-vanta-teal" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-vanta-teal" />
              </span>
              <span className="text-[10px] text-vanta-text-muted font-mono">Ethereum Sepolia</span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-vanta-teal/10 text-vanta-teal">testnet</span>
            </div>

            {/* Body */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {flow === 'providers' && (
                  <motion.div
                    key="providers"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-vanta-text-muted mb-3">Choose how to connect</p>

                    {/* Email option */}
                    {(hasEmail || providers.length === 0) && (
                      <ProviderButton
                        icon={<Mail size={16} className="text-vanta-teal" />}
                        label="Email"
                        sublabel="Embedded wallet via OTP"
                        onClick={() => setFlow('email')}
                      />
                    )}

                    {/* External wallets */}
                    {externalProviders.map((provider) => (
                      <ProviderButton
                        key={provider.groupKey}
                        icon={
                          provider.metadata?.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={provider.metadata.icon}
                              alt={provider.metadata.displayName}
                              className="w-5 h-5 rounded-md object-contain"
                            />
                          ) : (
                            <Wallet size={16} className="text-vanta-text-secondary" />
                          )
                        }
                        label={provider.metadata?.displayName ?? provider.key}
                        onClick={() => handleSelectProvider(provider.key)}
                        loading={loading}
                      />
                    ))}

                    {error && <p className="text-xs text-vanta-red mt-2">{error}</p>}
                  </motion.div>
                )}

                {flow === 'email' && (
                  <motion.div
                    key="email"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-vanta-text-muted">
                      We&apos;ll send a 6-digit code to your inbox
                    </p>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted"
                      autoFocus
                    />
                    {error && <p className="text-xs text-vanta-red">{error}</p>}
                    <Button
                      onClick={handleSendOTP}
                      disabled={loading || !email.trim()}
                      className="w-full bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send code'}
                    </Button>
                  </motion.div>
                )}

                {flow === 'otp' && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-vanta-text-muted">
                      Check <strong className="text-foreground">{email}</strong> for your code
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                      className="bg-vanta-elevated border-border-hover text-foreground font-mono text-center text-2xl tracking-[0.4em] py-3"
                      maxLength={6}
                      autoFocus
                    />
                    {error && <p className="text-xs text-vanta-red">{error}</p>}
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.length !== 6}
                      className="w-full bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify & connect'}
                    </Button>
                    <button
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="w-full text-xs text-vanta-text-muted hover:text-foreground transition-colors"
                    >
                      Resend code
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 pt-1 border-t border-border/50 text-center">
              <p className="text-[10px] text-vanta-text-muted">
                Powered by{' '}
                <span className="text-blue-400">Dynamic</span>
                {' · '}Secured by <span className="text-vanta-teal">VANTA</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProviderButton({
  icon,
  label,
  sublabel,
  onClick,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'w-full flex items-center gap-3 p-3 bg-vanta-elevated border border-border rounded-xl',
        'hover:border-vanta-teal/40 hover:bg-vanta-elevated/80 transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-vanta-surface border border-border/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <span className="text-sm text-foreground">{label}</span>
        {sublabel && <p className="text-[10px] text-vanta-text-muted mt-0.5">{sublabel}</p>}
      </div>
      {loading ? (
        <Loader2 size={14} className="text-vanta-text-muted animate-spin" />
      ) : (
        <ArrowRight size={14} className="text-vanta-text-muted" />
      )}
    </button>
  );
}
