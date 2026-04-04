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
}

// Detect unlimited ERC-20 approve (uint256 max)
function isUnlimitedApproval(data?: string): boolean {
  if (!data) return false
  const MAX_UINT256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  // approve(address,uint256) selector = 0x095ea7b3
  return data.startsWith('0x095ea7b3') && data.toLowerCase().includes(MAX_UINT256)
}

export function evaluateTransaction(
  tx: TxInput,
  rules: DbRule[],
  dailySpendUsd: number,
  ethPriceUsd: number
): PolicyResult {
  const txValueEth = Number(tx.value) / 1e18
  const txValueUsd = txValueEth * ethPriceUsd
  const matchedRules: string[] = []
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
        const addresses = (rule.config.addresses as string[] | undefined) ?? []
        if (addresses.map((a) => a.toLowerCase()).includes(tx.to.toLowerCase())) {
          matchedRules.push(rule.id)
          return { tier: 3, reason: `Destination ${tx.to} is blacklisted`, matchedRules }
        }
        break
      }

      case 'daily_limit': {
        const limit = Number(rule.config.amount ?? 0)
        if (dailySpendUsd + txValueUsd > limit) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          reason = `Daily limit $${limit} would be exceeded ($${(dailySpendUsd + txValueUsd).toFixed(2)})`
        }
        break
      }

      case 'per_tx_limit': {
        const limit = Number(rule.config.amount ?? 0)
        if (txValueUsd > limit) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          reason = `Transaction $${txValueUsd.toFixed(2)} exceeds per-tx limit $${limit}`
        }
        break
      }

      case 'whitelist': {
        const addresses = (rule.config.addresses as string[] | undefined) ?? []
        // If whitelist has entries and destination is on it → stay tier 1 for this check
        // If destination is NOT on whitelist → escalate to tier 2 (unknown address)
        if (addresses.length > 0 && !addresses.map((a) => a.toLowerCase()).includes(tx.to.toLowerCase())) {
          matchedRules.push(rule.id)
          tier = Math.max(tier, 2) as 1 | 2 | 3
          reason = 'Destination not in trusted address list'
        }
        break
      }

      case 'contract_whitelist': {
        if (tx.data && tx.data !== '0x') {
          const contracts = (rule.config.contracts as string[] | undefined) ?? []
          if (contracts.length > 0 && !contracts.map((a) => a.toLowerCase()).includes(tx.to.toLowerCase())) {
            matchedRules.push(rule.id)
            tier = Math.max(tier, 2) as 1 | 2 | 3
            reason = 'Contract interaction with non-whitelisted contract'
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
            reason = `Quiet hours active (${from}–${to} UTC)`
          }
        }
        break
      }
    }
  }

  return { tier, reason, matchedRules }
}
