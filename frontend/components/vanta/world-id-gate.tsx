'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IDKitRequestWidget,
  orbLegacy,
  type RpContext,
} from '@worldcoin/idkit';
import {
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Clock,
  Hash,
} from 'lucide-react';
import { VantaSpinner } from '@/components/vanta/loader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/vanta/status-badge';
import { useWorldId } from '@/hooks/useWorldId';
import { cn } from '@/lib/utils';

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;
const WORLD_RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID!;
const ACTION = 'verify-vanta-guardian';

interface WorldIdGateProps {
  address?: string;
  /** Compact mode for inline use (e.g. confirmation modal) */
  compact?: boolean;
  /** Called after successful verification */
  onVerified?: () => void;
}

/**
 * World ID verification component.
 * Full mode: used in settings with details + animations.
 * Compact mode: used inline in confirmation modal for Tier 3 override.
 */
export function WorldIdGate({ address, compact, onVerified }: WorldIdGateProps) {
  const {
    verified,
    loading,
    verifying,
    error,
    credentialType,
    verifiedAt,
    submitProof,
    getRpContext,
  } = useWorldId(address);

  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [rpError, setRpError] = useState<string | null>(null);
  const [loadingRp, setLoadingRp] = useState(false);

  // Fetch RP context when user wants to verify
  const handleStartVerify = useCallback(async () => {
    if (!WORLD_APP_ID || !WORLD_RP_ID) {
      setRpError('World ID not configured. Add NEXT_PUBLIC_WORLD_APP_ID and NEXT_PUBLIC_WORLD_RP_ID to .env');
      return;
    }

    setLoadingRp(true);
    setRpError(null);

    try {
      const ctx = await getRpContext(ACTION);
      setRpContext(ctx);
      setWidgetOpen(true);
    } catch (e) {
      setRpError((e as Error).message);
    } finally {
      setLoadingRp(false);
    }
  }, [getRpContext]);

  // Handle proof verification (called by IDKit widget)
  const handleVerify = useCallback(
    async (result: unknown) => {
      await submitProof(result);
    },
    [submitProof],
  );

  const handleSuccess = useCallback(() => {
    setWidgetOpen(false);
    onVerified?.();
  }, [onVerified]);

  const handleError = useCallback((errorCode: string) => {
    console.error('IDKit error:', errorCode);
    setRpError(`World ID error: ${errorCode}. Make sure you scan the QR code with the Worldcoin Simulator (staging) or World App.`);
    setWidgetOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-vanta-text-muted">
        <VantaSpinner size={14} />
        Checking World ID status...
      </div>
    );
  }

  // ─── Compact mode (for confirmation modal / inline) ───
  if (compact) {
    if (verified) {
      return (
        <div className="flex items-center gap-2 text-xs text-vanta-teal">
          <CheckCircle size={14} />
          <span>Human verified via World ID</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Button
          onClick={handleStartVerify}
          disabled={loadingRp || verifying || !address}
          size="sm"
          className="bg-gradient-to-r from-[#191C20] to-[#313640] text-white hover:from-[#2a2d32] hover:to-[#3d4149] border border-white/10"
        >
          {loadingRp || verifying ? (
            <Loader2 size={14} className="animate-spin mr-2" />
          ) : (
            <Globe size={14} className="mr-2" />
          )}
          Verify with World ID
        </Button>
        {error && <p className="text-xs text-vanta-red">{error}</p>}
        {rpError && <p className="text-xs text-vanta-red">{rpError}</p>}

        {rpContext && (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={setWidgetOpen}
            app_id={WORLD_APP_ID}
            action={ACTION}
            rp_context={rpContext}
            allow_legacy_proofs={true}
            environment="staging"
            preset={orbLegacy({ signal: address })}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
      </div>
    );
  }

  // ─── Derive display values ───
  const verificationMethod = credentialType === 'orb' ? 'Orb biometric' : credentialType ?? 'World ID';
  const verifiedDate = verifiedAt ? new Date(verifiedAt) : null;
  const verifiedDateStr = verifiedDate
    ? verifiedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'On record';
  const verifiedTimeStr = verifiedDate
    ? verifiedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  // ─── Full mode (settings page) ───
  return (
    <div className="space-y-4">
      {/* Header row — mirrors passkey layout */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={verified ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300',
            verified ? 'bg-vanta-teal/10' : 'bg-vanta-elevated',
          )}
        >
          <Globe
            size={22}
            className={cn(
              'transition-colors duration-300',
              verified ? 'text-vanta-teal' : 'text-vanta-text-muted',
            )}
          />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {verified ? 'Human verified' : 'Prove you are human'}
            </span>
            <AnimatePresence>
              {verified && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <StatusBadge variant="safe">Active</StatusBadge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-vanta-text-muted mt-0.5">
            {verified
              ? `Verified via ${verificationMethod} · World ID 4.0`
              : 'Proves a unique human controls this wallet. Required for Tier 3 override and higher trust limits.'}
          </p>
        </div>

        {!verified && (
          <Button
            onClick={handleStartVerify}
            disabled={loadingRp || verifying || !address}
            variant="outline"
            className={cn(
              "border-vanta-teal text-vanta-teal hover:bg-vanta-teal hover:text-vanta-bg transition-all",
            )}
          >
            {loadingRp || verifying ? (
              <Loader2 size={14} className="animate-spin mr-2" />
            ) : (
              <Globe size={14} className="mr-2" />
            )}
            {verifying ? 'Verifying...' : 'Verify now'}
          </Button>
        )}
      </div>

      {/* ─── Verified: Credential rows (like passkey list) ─── */}
      <AnimatePresence>
        {verified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Verification details row */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <ShieldCheck size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Proof of Human
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-vanta-teal/10 text-vanta-teal border border-vanta-teal/20">
                <Sparkles size={10} />
                World ID 4.0
              </span>
            </motion.div>

            {/* When verified row */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <Clock size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Verified {verifiedDateStr}{verifiedTimeStr ? ` at ${verifiedTimeStr}` : ''}
              </span>
              <span className="text-[10px] text-vanta-text-muted">
                via {verificationMethod}
              </span>
            </motion.div>

            {/* Tier 3 override */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <Shield size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Tier 3 override enabled
              </span>
              <span className="text-[10px] text-vanta-text-muted">
                approve blocked txns with biometric
              </span>
            </motion.div>

            {/* Daily limit bonus */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <Sparkles size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Daily spend limit 2×
              </span>
              <span className="text-[10px] text-vanta-text-muted">
                verified human trust bonus
              </span>
            </motion.div>

            {/* Sybil proof */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <Hash size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Unique nullifier stored
              </span>
              <span className="text-[10px] text-vanta-text-muted">
                Sybil-proof guardian identity
              </span>
            </motion.div>

            {/* Zero-knowledge privacy */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-vanta-elevated rounded-lg border border-border/50"
            >
              <EyeOff size={14} className="text-vanta-teal shrink-0" />
              <span className="text-xs text-foreground flex-1">
                Zero-knowledge proof
              </span>
              <span className="text-[10px] text-vanta-text-muted">
                no personal data shared with VANTA
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Not verified: benefit cards ─── */}
      {!verified && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {[
            {
              icon: Shield,
              label: 'Tier 3 Override',
              desc: 'Override blocked transactions with proof of human',
            },
            {
              icon: Sparkles,
              label: 'Higher Limits',
              desc: 'Verified humans get 2x daily spend limits',
            },
            {
              icon: CheckCircle,
              label: 'Sybil Resistant',
              desc: 'One human, one guardian — prevents duplicate accounts',
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="p-3 bg-vanta-elevated/50 rounded-lg border border-border/50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-vanta-teal" />
                <span className="text-[11px] font-medium text-foreground">
                  {label}
                </span>
              </div>
              <p className="text-[10px] text-vanta-text-muted">{desc}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Error states */}
      <AnimatePresence>
        {(error || rpError) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 bg-vanta-red/10 border border-vanta-red/20 rounded-lg text-xs text-vanta-red flex items-start gap-2"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p>{error || rpError}</p>
              {(error || rpError)?.includes('already been used') && (
                <p className="mt-1 text-vanta-text-muted">
                  Each World ID can only verify one VANTA guardian. This prevents
                  Sybil attacks on the transaction approval system.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!address && (
        <p className="text-xs text-vanta-amber flex items-center gap-1.5">
          <AlertTriangle size={12} />
          Connect your wallet first to verify with World ID
        </p>
      )}

      {/* IDKit Widget (invisible until triggered) */}
      {rpContext && (
        <IDKitRequestWidget
          open={widgetOpen}
          onOpenChange={setWidgetOpen}
          app_id={WORLD_APP_ID}
          action={ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          environment="staging"
          preset={orbLegacy({ signal: address })}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
