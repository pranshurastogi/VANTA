import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { scanTransaction, type ScanInput } from '@/lib/aiScanner';

// ── Rate Limiter (in-memory sliding window) ────────────────────────────

interface RateBucket {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateBucket>()

const RATE_LIMITS = {
  perMinute: 10,
  perHour: 50,
} as const

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  const oneHourAgo = now - 3_600_000

  let bucket = rateLimitStore.get(ip)
  if (!bucket) {
    bucket = { timestamps: [] }
    rateLimitStore.set(ip, bucket)
  }

  // Clean up old entries (older than 1 hour)
  bucket.timestamps = bucket.timestamps.filter(t => t > oneHourAgo)

  const lastMinute = bucket.timestamps.filter(t => t > oneMinuteAgo).length
  const lastHour = bucket.timestamps.length

  if (lastMinute >= RATE_LIMITS.perMinute) {
    const oldestInMinute = bucket.timestamps.filter(t => t > oneMinuteAgo).sort()[0]
    const resetIn = Math.ceil((oldestInMinute + 60_000 - now) / 1000)
    return { allowed: false, remaining: 0, resetIn }
  }

  if (lastHour >= RATE_LIMITS.perHour) {
    const oldestInHour = bucket.timestamps.sort()[0]
    const resetIn = Math.ceil((oldestInHour + 3_600_000 - now) / 1000)
    return { allowed: false, remaining: 0, resetIn }
  }

  const remaining = Math.min(
    RATE_LIMITS.perMinute - lastMinute - 1,
    RATE_LIMITS.perHour - lastHour - 1
  )

  return { allowed: true, remaining: Math.max(0, remaining), resetIn: 0 }
}

function recordRequest(ip: string) {
  const bucket = rateLimitStore.get(ip)
  if (bucket) {
    bucket.timestamps.push(Date.now())
  }
}

// Clean up stale IPs every 10 minutes
setInterval(() => {
  const oneHourAgo = Date.now() - 3_600_000
  for (const [ip, bucket] of rateLimitStore) {
    bucket.timestamps = bucket.timestamps.filter(t => t > oneHourAgo)
    if (bucket.timestamps.length === 0) {
      rateLimitStore.delete(ip)
    }
  }
}, 600_000)

// ── Constants ──────────────────────────────────────────────────────────

const ETH_PRICE_USD = 2400 // TODO: fetch live from CoinGecko

// ── POST: Scan a transaction ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip)

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        remaining: 0,
        resetIn: rateCheck.resetIn,
        message: `Too many scan requests. Try again in ${rateCheck.resetIn}s.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateCheck.resetIn),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { from, to, value, data, chainId, agentId, userAddress } = body as {
    from?: string
    to?: string
    value?: string
    data?: string
    chainId?: number
    agentId?: string
    userAddress?: string
  }

  if (!from || !to || value === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: from, to, value' },
      { status: 400 }
    )
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return NextResponse.json(
      { error: 'Invalid destination address format' },
      { status: 400 }
    )
  }

  // Record the request for rate limiting
  recordRequest(ip)

  const txInput: ScanInput = {
    from: from || '0x0000000000000000000000000000000000000000',
    to,
    value: String(value),
    data: data || undefined,
    chainId: chainId || 1,
    agentId: agentId || undefined,
  }

  const txValueUsd = (Number(value) / 1e18) * ETH_PRICE_USD

  // Run AI scan
  const scanResult = await scanTransaction(txInput, ETH_PRICE_USD)

  // Persist to Supabase scan_history
  let scanId: string | null = null
  try {
    const { data: inserted } = await supabaseAdmin
      .from('scan_history')
      .insert({
        user_address: (userAddress as string)?.toLowerCase() || null,
        from_address: from.toLowerCase(),
        to_address: to.toLowerCase(),
        value: String(value),
        value_usd: txValueUsd,
        calldata: data || null,
        chain_id: chainId || 1,
        agent_id: agentId || null,
        risk_score: scanResult.riskScore,
        recommendation: scanResult.recommendation,
        reasoning: scanResult.reasoning,
        checks: scanResult.checks,
        model: scanResult.model || 'gemini-3-flash',
        scan_source: 'manual',
        ip_address: ip,
      })
      .select('id')
      .single()

    scanId = inserted?.id || null
  } catch (err) {
    // Non-fatal: scan_history table might not exist yet
    console.warn('[Scanner] Could not persist scan:', err)
  }

  return NextResponse.json(
    {
      scanId,
      ...scanResult,
      valueUsd: txValueUsd,
      remaining: rateCheck.remaining,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    }
  )
}

// ── GET: Fetch scan history ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
  const userAddress = searchParams.get('userAddress')

  try {
    let query = supabaseAdmin
      .from('scan_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userAddress) {
      query = query.eq('user_address', userAddress.toLowerCase())
    }

    const { data: scans, error } = await query

    if (error) {
      // Table might not exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ scans: [], message: 'scan_history table not yet created' })
      }
      throw error
    }

    return NextResponse.json({ scans: scans || [] })
  } catch (err) {
    console.error('[Scanner] History fetch error:', err)
    return NextResponse.json({ scans: [], error: 'Could not load scan history' })
  }
}
