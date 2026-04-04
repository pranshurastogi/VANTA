// VANTA AI Scanner — Gemini 3 Flash powered transaction risk assessment
// Primary: Google Gemini 3 Flash API for deep AI analysis
// Fallback: Heuristic-based scanner if API call fails

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
  model?: string             // which model was used
}

// ── Gemini 3 Flash AI Scanner ──────────────────────────────────────────

const GEMINI_MODEL = 'gemini-3-flash-preview'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export async function scanTransaction(
  tx: ScanInput,
  ethPriceUsd: number
): Promise<ScanResult> {
  const apiKey = process.env.GEMINI_API_KEY

  // If no API key, fall back to heuristic scan
  if (!apiKey) {
    console.warn('[VANTA Scanner] No GEMINI_API_KEY found, using heuristic fallback')
    return heuristicScan(tx, ethPriceUsd)
  }

  try {
    return await geminiScan(tx, ethPriceUsd, apiKey)
  } catch (error) {
    console.error('[VANTA Scanner] Gemini API error, falling back to heuristic:', error)
    return heuristicScan(tx, ethPriceUsd)
  }
}

async function geminiScan(
  tx: ScanInput,
  ethPriceUsd: number,
  apiKey: string
): Promise<ScanResult> {
  const txValueUsd = (Number(tx.value) / 1e18) * ethPriceUsd

  const prompt = `You are VANTA, a blockchain transaction security scanner. Analyze this transaction and return a JSON risk assessment.

Transaction details:
- From: ${tx.from}
- To: ${tx.to}
- Value: ${tx.value} wei (approximately $${txValueUsd.toFixed(2)} USD)
- Calldata: ${tx.data || 'none (simple transfer)'}
- Chain ID: ${tx.chainId ?? 1}
- Initiated by: ${tx.agentId ? 'AI agent (' + tx.agentId + ')' : 'user directly'}

Evaluate these security checks:
1. Is the destination address format valid?
2. Does the calldata contain any suspicious function selectors (e.g., unlimited approvals 0x095ea7b3 with maxUint256, self-destruct patterns, transferOwnership, renounceOwnership)?
3. Does the transaction amount seem reasonable for a normal user transaction?
4. Is there any sign of urgency patterns or social engineering in the request context?
5. Does the calldata contain any personal identifiable information (PII) that would be stored on-chain?
6. Is this a standard transfer/swap pattern or something unusual?
7. Is the agent (if any) exhibiting suspicious behavior patterns?

Respond ONLY with this JSON structure, no other text:
{
  "riskScore": <0-100>,
  "recommendation": "<approve|flag|block>",
  "reasoning": "<one sentence summary>",
  "checks": [
    {"name": "<check name>", "passed": <true|false>, "detail": "<explanation>"}
  ]
}`

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            riskScore: { type: 'integer', description: 'Risk score from 0 to 100' },
            recommendation: {
              type: 'string',
              enum: ['approve', 'flag', 'block'],
              description: 'Action recommendation',
            },
            reasoning: { type: 'string', description: 'One sentence summary of the analysis' },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Check name' },
                  passed: { type: 'boolean', description: 'Whether the check passed' },
                  detail: { type: 'string', description: 'Explanation of the check result' },
                },
                required: ['name', 'passed', 'detail'],
              },
              description: 'Individual security checks performed',
            },
          },
          required: ['riskScore', 'recommendation', 'reasoning', 'checks'],
        },
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  // Extract the text from Gemini's response structure
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('') ?? ''

  if (!text) {
    throw new Error('Empty response from Gemini API')
  }

  // Parse the JSON response
  const cleaned = text.replace(/```json|```/g, '').trim()
  const result = JSON.parse(cleaned)

  // Clamp risk score to 0-100
  const riskScore = Math.max(0, Math.min(100, result.riskScore ?? 0))

  return {
    riskScore,
    recommendation: validateRecommendation(result.recommendation),
    reasoning: result.reasoning || 'Analysis complete.',
    checks: (result.checks || []).map((c: { name?: string; passed?: boolean; detail?: string }) => ({
      name: c.name || 'Unknown check',
      passed: !!c.passed,
      detail: c.detail || '',
    })),
    model: GEMINI_MODEL,
  }
}

function validateRecommendation(rec: string): 'approve' | 'flag' | 'block' {
  if (rec === 'approve' || rec === 'flag' || rec === 'block') return rec
  return 'flag' // default to flag if unknown
}

// ── Heuristic Fallback Scanner ─────────────────────────────────────────

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

function heuristicScan(tx: ScanInput, ethPriceUsd: number): ScanResult {
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

  // 2. Unlimited approval check
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

  // 5. Multicall / bundled operations
  if (selector === '0xac9650d8') {
    riskScore += 15
    if (dataLower.includes(MAX_UINT256)) {
      riskScore += 30
      checks.push({ name: 'Bundled call', passed: false, detail: 'multicall contains unlimited approval — disguised attack' })
    } else {
      checks.push({ name: 'Bundled call', passed: false, detail: 'multicall detected — bundled operations require careful review' })
    }
  }

  // 6. General risky selector
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

  return { riskScore, recommendation, reasoning, checks, model: 'heuristic-v1' }
}
