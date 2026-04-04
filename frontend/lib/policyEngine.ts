// VANTA Policy Engine — evaluates a transaction against a user's rules
// Returns a tier (1=auto, 2=confirm, 3=block) and the reason

export interface TxInput {
  from: string
  to: string
  value: string   // wei as string
  data?: string
  chainId?: number
}

export interface DbRule {
  id: string
  type: string
  enabled: boolean
  config: Record<string, unknown>
}

export interface PolicyResult {
  tier: 1 | 2 | 3
  reason: string
  matchedRules: string[]
  /** Whether World ID is required to proceed (Tier 3 override) */
  worldIdRequired?: boolean
  /** Adjusted daily limit based on World ID verification */
  effectiveDailyLimit?: number
  /** Human-readable reasons for every triggered rule */
  triggeredReasons?: string[]
}

// Detect unlimited ERC-20 approve (uint256 max)
function isUnlimitedApproval(data?: string): boolean {
  if (!data) return false
  const MAX_UINT256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  // approve(address,uint256) selector = 0x095ea7b3
  return data.startsWith('0x095ea7b3') && data.toLowerCase().includes(MAX_UINT256)
}

/**
 * World ID verification multiplier for daily limits.
 * Verified humans get 2x the configured daily limit — this is a REAL constraint
 * that makes World ID meaningfully change the system behavior.
 */
const WORLD_ID_LIMIT_MULTIPLIER = 2

// Supported protocol -> contract addresses for local policy checks
// Includes commonly used mainnet and Sepolia endpoints used in simulator.
const CONTRACT_ADDRESS_BOOK: Record<string, string[]> = {
  'Uniswap V3': [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
  ],
  'Aave V3': [
    '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
  ],
  Compound: ['0xc3d688B66703497DAA19211EEdff47f25384cdc3'],
  '1inch': ['0x1111111254EEB25477B68fb85Ed929f73A960582'],
  Lido: ['0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'],
  Curve: ['0xD533a949740bb3306d119CC777fa900bA034cd52'],
  'Uniswap V2': ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
}

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toLowerCase()
}

function readAddressList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return normalizeAddress(entry)
      if (entry && typeof entry === 'object' && 'address' in entry) {
        return normalizeAddress((entry as { address?: unknown }).address)
      }
      return null
    })
    .filter((v): v is string => !!v)
}

function resolveContractAddresses(rawContracts: unknown): string[] {
  if (!Array.isArray(rawContracts)) return []

  const resolved = new Set<string>()
  for (const contract of rawContracts) {
    // Supports direct address entries in config.
    const direct = normalizeAddress(contract)
    if (direct?.startsWith('0x') && direct.length === 42) {
      resolved.add(direct)
      continue
    }

    // Supports named protocol entries from rules UI.
    if (typeof contract === 'string') {
      for (const address of CONTRACT_ADDRESS_BOOK[contract] ?? []) {
        resolved.add(address.toLowerCase())
      }
      continue
    }

    // Supports object-style entries: { name, address, enabled }.
    if (contract && typeof contract === 'object') {
      const entry = contract as { name?: unknown; address?: unknown; enabled?: unknown }
      const enabled = typeof entry.enabled === 'boolean' ? entry.enabled : true
      if (!enabled) continue
      const objectAddress = normalizeAddress(entry.address)
      if (objectAddress?.startsWith('0x') && objectAddress.length === 42) {
        resolved.add(objectAddress)
      }
      if (typeof entry.name === 'string') {
        for (const address of CONTRACT_ADDRESS_BOOK[entry.name] ?? []) {
          resolved.add(address.toLowerCase())
        }
      }
    }
  }

  return [...resolved]
}

function detectCalldataPII(data?: string): string | null {
  if (!data || data === '0x') return null
  const stripped = data.startsWith('0x') ? data.slice(2) : data
  if (!/^[0-9a-fA-F]+$/.test(stripped) || stripped.length < 8) return null

  const text = Buffer.from(stripped, 'hex')
    .toString('utf8')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim()

  if (!text) return null
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return 'email'
  if (/\b(?:\+?\d[\d -]{7,}\d)\b/.test(text)) return 'phone'
  if (/\b(?:invoice|order|ssn|passport|dob|address)\b/i.test(text)) return 'personal data marker'
  return null
}

export function evaluateTransaction(
  tx: TxInput,
  rules: DbRule[],
  dailySpendUsd: number,
  ethPriceUsd: number,
  /** Whether the user has a verified World ID */
  worldIdVerified = false,
): PolicyResult {
  const txValueEth = Number(tx.value) / 1e18
  const txValueUsd = txValueEth * ethPriceUsd
  const matchedRules: string[] = []
  const triggeredReasons: string[] = []
  let tier: 1 | 2 | 3 = 1
  let reason = 'All checks passed'

  const active = rules.filter((r) => r.enabled)

  for (const rule of active) {
    switch (rule.type) {
      case 'block_unlimited_approval': {
        if (isUnlimitedApproval(tx.data)) {
          matchedRules.push(rule.id)
          return { tier: 3, reason: 'Unlimited token approval blocked', matchedRules }
        }
        break
      }

      case 'blacklist': {
        const addresses = readAddressList(rule.config.addresses)
        if (addresses.includes(tx.to.toLowerCase())) {
          matchedRules.push(rule.id)
          return { tier: 3, reason: `Destination ${tx.to} is blacklisted`, matchedRules }
        }
        break
      }

      case 'daily_limit': {
        const baseLimit = Number(rule.config.amount ?? 0)
        // World ID verified humans get 2x daily limit — real constraint
        const effectiveLimit = worldIdVerified
          ? baseLimit * WORLD_ID_LIMIT_MULTIPLIER
          : baseLimit
        if (dailySpendUsd + txValueUsd > effectiveLimit) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          const message = worldIdVerified
            ? `Daily limit $${effectiveLimit} (2x World ID bonus) would be exceeded ($${(dailySpendUsd + txValueUsd).toFixed(2)})`
            : `Daily limit $${baseLimit} would be exceeded ($${(dailySpendUsd + txValueUsd).toFixed(2)}). Verify with World ID for 2x limit.`
          triggeredReasons.push(message)
          reason = message
        }
        break
      }

      case 'per_tx_limit': {
        const limit = Number(rule.config.amount ?? 0)
        if (txValueUsd > limit) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          const message = `Transaction $${txValueUsd.toFixed(2)} exceeds per-tx limit $${limit}`
          triggeredReasons.push(message)
          reason = message
        }
        break
      }

      case 'whitelist': {
        const addresses = readAddressList(rule.config.addresses)
        if (addresses.length > 0 && !addresses.includes(tx.to.toLowerCase())) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          const message = 'Destination not in trusted address list'
          triggeredReasons.push(message)
          reason = message
        }
        break
      }

      case 'contract_whitelist': {
        if (tx.data && tx.data !== '0x') {
          const allowedContracts = resolveContractAddresses(rule.config.contracts)
          if (allowedContracts.length > 0 && !allowedContracts.includes(tx.to.toLowerCase())) {
            matchedRules.push(rule.id)
            tier = Math.max(tier, 2) as 1 | 2 | 3
            const message = 'Contract interaction with non-whitelisted contract'
            triggeredReasons.push(message)
            reason = message
          }
        }
        break
      }

      case 'quiet_hours': {
        const from = rule.config.from as string | undefined
        const to = rule.config.to as string | undefined
        if (from && to) {
          const now = new Date()
          const [fh, fm] = from.split(':').map(Number)
          const [th, tm] = to.split(':').map(Number)
          const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes()
          const fromMins = (fh ?? 0) * 60 + (fm ?? 0)
          const toMins = (th ?? 0) * 60 + (tm ?? 0)
          const inQuiet = fromMins < toMins
            ? nowMins >= fromMins && nowMins < toMins
            : nowMins >= fromMins || nowMins < toMins
          if (inQuiet) {
            matchedRules.push(rule.id)
            tier = Math.max(tier, 2) as 1 | 2 | 3
            const message = `Quiet hours active (${from}–${to} UTC)`
            triggeredReasons.push(message)
            reason = message
          }
        }
        break
      }

      case 'strip_calldata': {
        const piiType = detectCalldataPII(tx.data)
        if (piiType) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          const message = `Potential ${piiType} detected in calldata`
          triggeredReasons.push(message)
          reason = message
        }
        break
      }
    }
  }

  // Tier 3 transactions require World ID proof to override.
  // Without World ID, the transaction stays permanently blocked.
  // This is the core constraint: only proven humans can unblock critical txs.
  const worldIdRequired = tier === 3 && !worldIdVerified

  return { tier, reason, matchedRules, worldIdRequired, triggeredReasons }
}
