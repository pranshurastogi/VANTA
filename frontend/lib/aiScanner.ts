// VANTA AI Scanner — heuristic risk assessment for transactions
// Can be upgraded to call Claude API for deeper analysis

export interface ScanInput {
  from: string
  to: string
  value: string
  data?: string
  chainId?: number
  agentId?: string
}

export interface ScanCheck {
  name: string
  passed: boolean
  detail: string
}

export interface ScanResult {
  riskScore: number          // 0–100
  recommendation: 'approve' | 'flag' | 'block'
  reasoning: string
  checks: ScanCheck[]
}

// Known high-risk patterns in calldata selectors
const RISKY_SELECTORS: Record<string, string> = {
  '0x095ea7b3': 'ERC-20 approve',
  '0x23b872dd': 'transferFrom',
  '0xf2fde38b': 'transferOwnership',
  '0x715018a6': 'renounceOwnership',
}

function isLargeValue(value: string, ethPrice: number, threshold = 10000): boolean {
  return (Number(value) / 1e18) * ethPrice > threshold
}

export async function scanTransaction(
  tx: ScanInput,
  ethPriceUsd: number
): Promise<ScanResult> {
  const checks: ScanCheck[] = []
  let riskScore = 0

  // 1. Unlimited approval check
  const MAX_UINT256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  const isUnlimitedApproval = tx.data?.startsWith('0x095ea7b3') && tx.data.toLowerCase().includes(MAX_UINT256)
  if (isUnlimitedApproval) {
    riskScore += 60
    checks.push({ name: 'Token approval', passed: false, detail: 'Unlimited (max uint256) approval detected' })
  } else {
    checks.push({ name: 'Token approval', passed: true, detail: 'No unlimited approval found' })
  }

  // 2. Risky calldata selectors
  const selector = tx.data?.slice(0, 10)
  const riskyLabel = selector ? RISKY_SELECTORS[selector] : null
  if (riskyLabel && !isUnlimitedApproval) {
    riskScore += 15
    checks.push({ name: 'Calldata analysis', passed: false, detail: `${riskyLabel} function call` })
  } else {
    checks.push({ name: 'Calldata analysis', passed: true, detail: tx.data && tx.data !== '0x' ? 'Standard calldata' : 'No calldata (simple transfer)' })
  }

  // 3. High value check
  const txValueUsd = (Number(tx.value) / 1e18) * ethPriceUsd
  if (isLargeValue(tx.value, ethPriceUsd)) {
    riskScore += 20
    checks.push({ name: 'Value check', passed: false, detail: `High value transfer: $${txValueUsd.toFixed(2)}` })
  } else {
    checks.push({ name: 'Value check', passed: true, detail: `Amount $${txValueUsd.toFixed(2)} within normal range` })
  }

  // 4. Zero value to contract (possible drainer)
  const isContractCall = tx.data && tx.data !== '0x'
  if (isContractCall && tx.value === '0') {
    checks.push({ name: 'Contract interaction', passed: true, detail: 'Zero-value contract call' })
  } else if (isContractCall) {
    checks.push({ name: 'Contract interaction', passed: true, detail: 'Value-bearing contract call' })
  } else {
    checks.push({ name: 'Contract interaction', passed: true, detail: 'Simple ETH transfer' })
  }

  // 5. Self-transfer
  if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
    riskScore += 5
    checks.push({ name: 'Destination', passed: false, detail: 'Sending to own address' })
  } else {
    checks.push({ name: 'Destination', passed: true, detail: 'Valid recipient address' })
  }

  riskScore = Math.min(100, riskScore)

  const recommendation: ScanResult['recommendation'] =
    riskScore >= 70 ? 'block' :
    riskScore >= 30 ? 'flag' :
    'approve'

  const reasoning =
    recommendation === 'block'
      ? 'High-risk transaction pattern detected. Manual review required.'
      : recommendation === 'flag'
      ? 'Moderate risk indicators. Human confirmation recommended.'
      : 'Transaction appears safe based on heuristic checks.'

  return { riskScore, recommendation, reasoning, checks }
}
