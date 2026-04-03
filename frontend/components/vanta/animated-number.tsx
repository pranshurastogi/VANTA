"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useSpring, useTransform } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}

export function AnimatedNumber({ 
  value, 
  prefix = "", 
  suffix = "", 
  className = "",
  decimals = 0 
}: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (current) => 
    `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  )
}

interface CounterProps {
  value: number
  className?: string
}

export function Counter({ value, className = "" }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const diff = value - prevValue.current
    const steps = Math.abs(diff)
    const increment = diff > 0 ? 1 : -1
    let current = prevValue.current

    if (steps === 0) return

    const interval = setInterval(() => {
      current += increment
      setDisplayValue(current)
      if (current === value) {
        clearInterval(interval)
      }
    }, Math.max(50, 500 / steps))

    prevValue.current = value

    return () => clearInterval(interval)
  }, [value])

  return (
    <span className={`animate-count ${className}`}>
      {displayValue}
    </span>
  )
}
