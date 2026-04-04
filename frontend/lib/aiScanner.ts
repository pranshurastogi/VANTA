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

// Known high-risk function selectors
const RISKY_SELECTORS: Record<string, { label: string; risk: number }> = {
  '0x095ea7b3': { label: 'ERC-20 approve', risk: 10 },
  '0x23b872dd': { label: 'transferFrom', risk: 15 },
  '0xf2fde38b': { label: 'transferOwnership', risk: 40 },
  '0x715018a6': { label: 'renounceOwnership', risk: 50 },
  '0xa22cb465': { label: 'setApprovalForAll (NFT)', risk: 45 },
  '0xac9650d8': { label: 'multicall (bundled)', risk: 20 },
  '0x42842e0e': { label: 'safeTransferFrom (NFT)', risk: 10 },
}

// Known scam / honeypot addresses (simulated threat DB)
const KNOWN_SCAM_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000bad',
  '0xbadc0de0000000000000000000000000badc0de0',
  '0xdead000000000000000000000000000000000000',
].map(a => a.toLowerCase()))

function isLargeValue(value: string, ethPrice: number, threshold = 10000): boolean {
  return (Number(value) / 1e18) * ethPrice > threshold
}

export async function scanTransaction(
  tx: ScanInput,
  ethPriceUsd: number
): Promise<ScanResult> {
  const checks: ScanCheck[] = []
  let riskScore = 0

  const selector = tx.data?.slice(0, 10)?.toLowerCase()
  const dataLower = tx.data?.toLowerCase() ?? ''
  const MAX_UINT256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

  // 1. Known scam address check
  if (KNOWN_SCAM_ADDRESSES.has(tx.to.toLowerCase())) {
    riskScore += 50
    checks.push({ name: 'Address reputation', passed: false, detail: `Destination ${tx.to.slice(0, 10)}… flagged in VANTA threat database` })
  } else {
    checks.push({ name: 'Address reputation', passed: true, detail: 'Destination not flagged in threat database' })
  }

  // 2. Unlimited approval check (classic approval phishing)
  const isUnlimitedApproval = selector === '0x095ea7b3' && dataLower.includes(MAX_UINT256)
  if (isUnlimitedApproval) {
    riskScore += 55
    checks.push({ name: 'Token approval', passed: false, detail: 'Unlimited (MAX_UINT256) approval — classic approval phishing pattern' })
  } else if (selector === '0x095ea7b3') {
    checks.push({ name: 'Token approval', passed: true, detail: 'Bounded token approval — amount is capped' })
  } else {
    checks.push({ name: 'Token approval', passed: true, detail: 'No token approval in this transaction' })
  }

  // 3. setApprovalForAll check (NFT drainer)
  if (selector === '0xa22cb465') {
    // Check if setting approval to true (last 64 chars contain "1")
    const approvalFlag = tx.data?.slice(-64)
    if (approvalFlag && parseInt(approvalFlag, 16) === 1) {
      riskScore += 45
      checks.push({ name: 'NFT approval', passed: false, detail: 'setApprovalForAll(true) — grants full collection access to operator' })
    } else {
      checks.push({ name: 'NFT approval', passed: true, detail: 'setApprovalForAll(false) — revoking operator access' })
    }
  }

  // 4. Ownership transfer / renounce checks
  if (selector === '0xf2fde38b') {
    riskScore += 40
    checks.push({ name: 'Ownership', passed: false, detail: 'transferOwnership() — contract admin transfer to new address' })
  } else if (selector === '0x715018a6') {
    riskScore += 50
    checks.push({ name: 'Ownership', passed: false, detail: 'renounceOwnership() — irreversible admin key burn' })
  }

  // 5. Multicall / bundled operations (can hide malicious calls)
  if (selector === '0xac9650d8') {
    riskScore += 15
    // Check if the bundled data contains suspicious patterns
    if (dataLower.includes(MAX_UINT256)) {
      riskScore += 30
      checks.push({ name: 'Bundled call', passed: false, detail: 'multicall contains unlimited approval — disguised attack' })
    } else {
      checks.push({ name: 'Bundled call', passed: false, detail: 'multicall detected — bundled operations require careful review' })
    }
  }

  // 6. General risky selector (if not already caught above)
  if (selector && RISKY_SELECTORS[selector] && !isUnlimitedApproval && selector !== '0xa22cb465' && selector !== '0xf2fde38b' && selector !== '0x715018a6' && selector !== '0xac9650d8') {
    const info = RISKY_SELECTORS[selector]
    riskScore += info.risk
    checks.push({ name: 'Calldata analysis', passed: info.risk <= 10, detail: `${info.label} function call detected` })
  } else if (tx.data && tx.data !== '0x' && !RISKY_SELECTORS[selector ?? '']) {
    checks.push({ name: 'Calldata analysis', passed: true, detail: 'Contract interaction with unrecognized function' })
  } else if (!tx.data || tx.data === '0x') {
    checks.push({ name: 'Calldata analysis', passed: true, detail: 'Simple ETH transfer — no calldata' })
  }

  // 7. High value check
  const txValueUsd = (Number(tx.value) / 1e18) * ethPriceUsd
  if (isLargeValue(tx.value, ethPriceUsd, 20000)) {
    riskScore += 25
    checks.push({ name: 'Value check', passed: false, detail: `Very high value: $${txValueUsd.toFixed(2)} (>$20,000)` })
  } else if (isLargeValue(tx.value, ethPriceUsd, 5000)) {
    riskScore += 10
    checks.push({ name: 'Value check', passed: false, detail: `Elevated value: $${txValueUsd.toFixed(2)} (>$5,000)` })
  } else {
    checks.push({ name: 'Value check', passed: true, detail: `Amount $${txValueUsd.toFixed(2)} within normal range` })
  }

  // 8. Self-transfer
  if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
    riskScore += 5
    checks.push({ name: 'Destination', passed: false, detail: 'Sending to own address — unusual pattern' })
  } else {
    checks.push({ name: 'Destination', passed: true, detail: 'Recipient is different from sender' })
  }

  // 9. Suspicious agent name patterns
  const suspiciousAgents = ['compromised', 'rogue', 'phishing', 'exploit', 'hack']
  if (tx.agentId && suspiciousAgents.some(s => tx.agentId!.toLowerCase().includes(s))) {
    riskScore += 10
    checks.push({ name: 'Agent trust', passed: false, detail: `Agent "${tx.agentId}" has suspicious naming pattern` })
  } else {
    checks.push({ name: 'Agent trust', passed: true, detail: tx.agentId ? `Agent "${tx.agentId}" — no reputation flags` : 'No agent ID provided' })
  }

  riskScore = Math.min(100, riskScore)

  const recommendation: ScanResult['recommendation'] =
    riskScore >= 70 ? 'block' :
    riskScore >= 30 ? 'flag' :
    'approve'

  // Generate detailed reasoning based on what was found
  let reasoning: string
  if (recommendation === 'block') {
    const threats = checks.filter(c => !c.passed).map(c => c.name).join(', ')
    reasoning = `High-risk transaction blocked. Threats detected: ${threats}. Manual review with World ID verification required to override.`
  } else if (recommendation === 'flag') {
    const warnings = checks.filter(c => !c.passed).map(c => c.detail).join('; ')
    reasoning = `Moderate risk — human confirmation recommended. Flags: ${warnings}`
  } else {
    reasoning = 'All security checks passed. Transaction appears safe based on heuristic analysis. No known threat patterns detected.'
  }

  return { riskScore, recommendation, reasoning, checks }
}
