"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/** Dark UI (default) → light logo file; light UI → dark logo file */
export type VantaLogoVariant = "onDark" | "onLight"

function logoSrc(variant: VantaLogoVariant) {
  return variant === "onLight" ? "/vanta-dark-logo.png" : "/vanta-white-logo.png"
}

interface VantaLogoProps {
  size?: number
  className?: string
  animated?: boolean
  variant?: VantaLogoVariant
}

export function VantaLogo({
  size = 28,
  className = "",
  animated = false,
  variant = "onDark",
}: VantaLogoProps) {
  const src = logoSrc(variant)

  const img = (
    <Image
      src={src}
      alt="VANTA"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  )

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 20,
          },
        }}
      >
        {img}
      </motion.div>
    )
  }

  return img
}

interface VantaWordmarkProps {
  className?: string
  variant?: VantaLogoVariant
}

export function VantaWordmark({ className = "", variant = "onDark" }: VantaWordmarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-9 w-[132px] shrink-0">
        <Image
          src={logoSrc(variant)}
          alt="VANTA"
          fill
          className="object-contain object-left"
          sizes="132px"
          priority
        />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-[10px] text-vanta-text-muted leading-tight">wallet daemon</span>
      </div>
    </div>
  )
}
