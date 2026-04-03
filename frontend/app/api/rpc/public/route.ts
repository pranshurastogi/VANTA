import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxies JSON-RPC 2.0 to Ethereum HTTP RPC. Mitigates public-RPC 429s via:
 * - Short TTL cache for poll-heavy read methods
 * - In-flight deduplication (identical body shares one upstream request)
 * - Fallback RPC URLs on 429 / 503
 *
 * Prefer RPC_URL / ETHEREUM_RPC_URL (e.g. Infura/Alchemy) in production.
 */
export const runtime = 'nodejs'

const PRIMARY_RPC =
  process.env.RPC_URL?.trim() ||
  process.env.ETHEREUM_RPC_URL?.trim() ||
  ''

/** Extra endpoints tried in order after primary (or as defaults if no primary). */
const DEFAULT_FALLBACKS = [
  'https://ethereum.publicnode.com',
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://eth.llamarpc.com',
]

function parseFallbackEnv(): string[] {
  const raw = process.env.RPC_FALLBACK_URLS?.trim()
  if (!raw) return []
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
}

function rpcUrlChain(): string[] {
  const extra = parseFallbackEnv()
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of [PRIMARY_RPC, ...extra, ...DEFAULT_FALLBACKS]) {
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

/** ms; only methods listed here participate in response caching (entire body must be cacheable). */
const METHOD_TTL_MS: Record<string, number> = {
  eth_chainId: 5 * 60_000,
  net_version: 5 * 60_000,
  web3_clientVersion: 60_000,
  eth_gasPrice: 15_000,
  eth_maxPriorityFeePerGas: 15_000,
  eth_blobBaseFee: 15_000,
  eth_blockNumber: 2_000,
  eth_getBlockByNumber: 2_000,
  eth_getBlockByHash: 2_000,
  eth_syncing: 5_000,
  eth_feeHistory: 10_000,
}

function cacheTtlForBody(body: string): number | null {
  try {
    const parsed: unknown = JSON.parse(body || '{}')
    const items = Array.isArray(parsed) ? parsed : [parsed]
    if (items.length === 0 || items.length > 32) return null
    let min = Number.POSITIVE_INFINITY
    for (const item of items) {
      if (!item || typeof item !== 'object') return null
      const method = (item as { method?: string }).method
      if (!method || !(method in METHOD_TTL_MS)) return null
      min = Math.min(min, METHOD_TTL_MS[method]!)
    }
    return Number.isFinite(min) ? min : null
  } catch {
    return null
  }
}

function isJsonRpcSuccessPayload(text: string): boolean {
  try {
    const p: unknown = JSON.parse(text)
    if (Array.isArray(p)) {
      return p.length > 0 && p.every((x) => x && typeof x === 'object' && !(x as { error?: unknown }).error)
    }
    return !!(p && typeof p === 'object' && !(p as { error?: unknown }).error)
  } catch {
    return false
  }
}

type Cached = { expires: number; text: string; status: number }
const responseCache = new Map<string, Cached>()
const inflight = new Map<string, Promise<{ text: string; status: number }>>()
const MAX_CACHE = 400

function cacheGet(key: string): Cached | null {
  const e = responseCache.get(key)
  if (!e) return null
  if (Date.now() > e.expires) {
    responseCache.delete(key)
    return null
  }
  return e
}

function cacheSet(key: string, text: string, status: number, ttlMs: number) {
  while (responseCache.size >= MAX_CACHE) {
    const first = responseCache.keys().next().value as string | undefined
    if (first) responseCache.delete(first)
    else break
  }
  responseCache.set(key, { expires: Date.now() + ttlMs, text, status })
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

async function fetchFromChain(body: string): Promise<{ text: string; status: number }> {
  const urls = rpcUrlChain()
  let lastText = '{"jsonrpc":"2.0","id":null,"error":{"code":-32603,"message":"No RPC endpoint configured"}}'
  let lastStatus = 502

  for (const url of urls) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body || '{}',
        cache: 'no-store',
      })
    } catch {
      continue
    }

    const text = await res.text()
    lastText = text
    lastStatus = res.status

    if (res.status === 429 || res.status === 503) {
      continue
    }

    return { text, status: res.status }
  }

  return { text: lastText, status: lastStatus >= 400 ? lastStatus : 502 }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const key = body || '{}'
  const ttl = cacheTtlForBody(key)

  if (ttl != null) {
    const hit = cacheGet(key)
    if (hit) {
      return new NextResponse(hit.text, {
        status: hit.status,
        headers: {
          'Content-Type': 'application/json',
          ...cors,
        },
      })
    }
  }

  const existing = inflight.get(key)
  if (existing) {
    const r = await existing
    return new NextResponse(r.text, {
      status: r.status,
      headers: {
        'Content-Type': 'application/json',
        ...cors,
      },
    })
  }

  const promise = fetchFromChain(key).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)

  const r = await promise

  if (ttl != null && r.status === 200 && isJsonRpcSuccessPayload(r.text)) {
    cacheSet(key, r.text, r.status, ttl)
  }

  return new NextResponse(r.text, {
    status: r.status,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
    },
  })
}
