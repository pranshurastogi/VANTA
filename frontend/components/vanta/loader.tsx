'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VantaLoaderProps {
  /** Size in px (default 40) */
  size?: number;
  /** Optional text below spinner */
  text?: string;
  className?: string;
}

/**
 * Animated VANTA logo loader.
 * Pulsing glow + rotating ring around the logo.
 */
export function VantaLoader({ size = 40, text, className }: VantaLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative" style={{ width: size + 16, height: size + 16 }}>
        {/* Rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#00FFB2',
            borderRightColor: 'rgba(0,255,178,0.3)',
          }}
        />

        {/* Pulsing glow */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-vanta-teal/10 blur-sm"
        />

        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/vanta-logo-transparent.png"
              alt="Loading"
              width={size}
              height={size}
              className="object-contain"
              priority
            />
          </motion.div>
        </div>
      </div>

      {text && (
        <motion.p
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-xs text-vanta-text-muted font-mono"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

/** Inline/small loader — just the spinning ring + mini logo */
export function VantaSpinner({ size = 20 }: { size?: number }) {
  return (
    <div className="relative inline-flex" style={{ width: size + 8, height: size + 8 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full"
        style={{
          border: '1.5px solid transparent',
          borderTopColor: '#00FFB2',
          borderRightColor: 'rgba(0,255,178,0.2)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/vanta-logo-transparent.png"
          alt=""
          width={size}
          height={size}
          className="object-contain opacity-70"
        />
      </div>
    </div>
  );
}
