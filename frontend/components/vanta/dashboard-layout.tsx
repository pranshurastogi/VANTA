"use client"

import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar, MobileNav } from "./sidebar"
import { TopBar } from "./top-bar"

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  pendingCount?: number
  onBellClick?: () => void
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 }
  }
}

export function DashboardLayout({ children, title, pendingCount, onBellClick }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-vanta-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="md:ml-60 pb-20 md:pb-0">
        <TopBar title={title} pendingCount={pendingCount} onBellClick={onBellClick} />
        <AnimatePresence mode="wait">
          <motion.div
            key={title}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-6 max-w-[960px] mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}
