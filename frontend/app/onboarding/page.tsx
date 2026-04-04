"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Wallet, Shield, Sparkles, ArrowRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { VantaLogo } from "@/components/vanta/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, label: "Connect" },
  { id: 2, label: "Verify" },
  { id: 3, label: "Setup" },
  { id: 4, label: "Complete" },
]

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
              currentStep > step.id
                ? "bg-vanta-teal text-vanta-bg"
                : currentStep === step.id
                ? "bg-vanta-teal text-vanta-bg"
                : "bg-vanta-elevated text-vanta-text-muted"
            )}
          >
            {currentStep > step.id ? <Check size={14} /> : step.id}
          </motion.div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 transition-colors",
                currentStep > step.id ? "bg-vanta-teal" : "bg-vanta-elevated"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

type SecurityPreset = "conservative" | "balanced" | "advanced"

const presets = [
  {
    id: "conservative" as SecurityPreset,
    name: "Conservative",
    description: "$100 daily limit, all new addresses require confirmation",
    icon: Shield,
  },
  {
    id: "balanced" as SecurityPreset,
    name: "Balanced",
    description: "$500 daily limit, whitelisted DEXes auto-approved",
    icon: Shield,
    recommended: true,
  },
  {
    id: "advanced" as SecurityPreset,
    name: "Advanced",
    description: "$2,000 daily limit, most DEXes auto-approved",
    icon: Sparkles,
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ensName, setEnsName] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<SecurityPreset>("balanced")
  const [showExplanation, setShowExplanation] = useState(false)

  const { primaryWallet, setShowAuthFlow } = useDynamicContext()

  // Advance to step 2 once wallet is connected
  useEffect(() => {
    if (primaryWallet && step === 1) {
      setIsConnecting(false)
      setStep(2)
    }
  }, [primaryWallet, step])

  const handleConnect = () => {
    setIsConnecting(true)
    setShowAuthFlow(true)
  }

  const handleVerify = () => {
    setStep(3)
  }

  const handleSetup = () => {
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-vanta-bg flex flex-col items-center justify-center p-6">
      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <StepIndicator currentStep={step} />
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Connect Wallet */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-vanta-surface border border-border rounded-2xl p-8 text-center">
              <VantaLogo size={48} className="mx-auto mb-6" />
              <h1 className="font-mono text-xl text-foreground mb-2">Connect your wallet</h1>
              <p className="text-sm text-vanta-text-secondary mb-8">
                Connect your wallet to start protecting your transactions
              </p>

              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full h-12 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 font-medium"
              >
                {isConnecting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-vanta-bg/30 border-t-vanta-bg rounded-full"
                  />
                ) : (
                  <>
                    <Wallet size={18} className="mr-2" />
                    Connect with Dynamic
                  </>
                )}
              </Button>

              <div className="mt-4 text-xs text-vanta-text-muted">
                or connect with
              </div>
              <div className="flex justify-center gap-4 mt-3">
                {["MetaMask", "Coinbase", "WalletConnect"].map((wallet) => (
                  <button
                    key={wallet}
                    className="px-4 py-2 bg-vanta-elevated rounded-lg text-xs text-vanta-text-secondary hover:text-foreground transition-colors"
                  >
                    {wallet}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="mt-6 flex items-center justify-center gap-1 text-xs text-vanta-text-muted hover:text-foreground transition-colors mx-auto"
              >
                What is VANTA?
                <motion.div
                  animate={{ rotate: showExplanation ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showExplanation && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 text-xs text-vanta-text-secondary overflow-hidden"
                  >
                    VANTA is an AI-powered wallet security daemon that protects your transactions
                    using Vitalik&apos;s 2-of-2 human+AI confirmation model.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Step 2: Verify Identity */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-vanta-surface border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-vanta-elevated flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-vanta-teal" />
                  <circle cx="16" cy="16" r="6" fill="currentColor" className="text-vanta-teal" />
                </svg>
              </div>
              <h1 className="font-mono text-xl text-foreground mb-2">Verify your identity</h1>
              <p className="text-sm text-vanta-text-secondary mb-8">
                World ID verification ensures a human controls this daemon
              </p>

              <Button
                onClick={handleVerify}
                className="w-full h-12 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 font-medium"
              >
                Verify with World ID
              </Button>

              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="mt-6 flex items-center justify-center gap-1 text-xs text-vanta-text-muted hover:text-foreground transition-colors mx-auto"
              >
                Why do we need this?
                <motion.div
                  animate={{ rotate: showExplanation ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showExplanation && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 text-xs text-vanta-text-secondary overflow-hidden"
                  >
                    World ID proves a human controls the daemon, enabling Tier 3 confirmations
                    for high-risk transactions.
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                onClick={() => setStep(3)}
                className="mt-4 text-xs text-vanta-text-muted hover:text-foreground transition-colors"
              >
                Skip for now →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Setup Daemon */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg"
          >
            <div className="bg-vanta-surface border border-border rounded-2xl p-8">
              <h1 className="font-mono text-xl text-foreground mb-2 text-center">
                Set up your daemon
              </h1>
              <p className="text-sm text-vanta-text-secondary mb-8 text-center">
                Choose your security preferences
              </p>

              {/* ENS Name */}
              <div className="mb-6">
                <label className="text-xs text-vanta-text-muted mb-2 block">
                  ENS subname (optional)
                </label>
                <div className="flex items-center">
                  <Input
                    placeholder="myname"
                    value={ensName}
                    onChange={(e) => setEnsName(e.target.value)}
                    className="bg-vanta-elevated border-border-hover text-foreground placeholder:text-vanta-text-muted rounded-r-none"
                  />
                  <span className="px-3 py-2 bg-vanta-elevated border border-l-0 border-border-hover rounded-r-lg text-vanta-text-muted text-sm">
                    .vanta.eth
                  </span>
                </div>
              </div>

              {/* Security Presets */}
              <div className="space-y-3 mb-8">
                <label className="text-xs text-vanta-text-muted mb-2 block">
                  Security level
                </label>
                {presets.map((preset) => {
                  const Icon = preset.icon
                  return (
                    <motion.button
                      key={preset.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        "w-full flex items-start gap-4 p-4 rounded-xl border transition-colors text-left",
                        selectedPreset === preset.id
                          ? "border-vanta-teal bg-vanta-teal/5"
                          : "border-border hover:border-border-hover"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedPreset === preset.id ? "bg-vanta-teal/10" : "bg-vanta-elevated"
                      )}>
                        <Icon size={20} className={selectedPreset === preset.id ? "text-vanta-teal" : "text-vanta-text-muted"} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{preset.name}</span>
                          {preset.recommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-vanta-teal/10 text-vanta-teal">
                              recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-vanta-text-muted mt-1">
                          {preset.description}
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedPreset === preset.id ? "border-vanta-teal" : "border-vanta-text-muted"
                      )}>
                        {selectedPreset === preset.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-vanta-teal" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <Button
                onClick={handleSetup}
                className="w-full h-12 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 font-medium"
              >
                Continue
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
              className="relative w-24 h-24 mx-auto mb-8"
            >
              <VantaLogo size={64} className="mx-auto" />
              {/* Particle burst */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ 
                    scale: [0, 1.5],
                    opacity: [1, 0],
                    x: Math.cos((i * Math.PI * 2) / 8) * 60,
                    y: Math.sin((i * Math.PI * 2) / 8) * 60,
                  }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-vanta-teal"
                />
              ))}
            </motion.div>

            <h1 className="font-mono text-2xl text-foreground mb-2">
              Your daemon is active
            </h1>
            <p className="text-sm text-vanta-text-secondary mb-8">
              Monitoring your wallet 24/7
            </p>

            <Link href="/dashboard">
              <Button className="h-12 px-8 bg-vanta-teal text-vanta-bg hover:bg-vanta-teal/90 font-medium">
                Go to dashboard
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
