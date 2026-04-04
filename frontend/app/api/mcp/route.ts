import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evaluateTransaction } from '@/lib/policyEngine';
import { scanTransaction } from '@/lib/aiScanner';

const ETH_PRICE_USD = 2400;
const SKIPPED_SCAN_RESULT = {
  riskScore: 0,
  recommendation: 'approve' as const,
  reasoning: 'AI scan skipped; verdict reflects policy engine output only.',
  checks: [],
  model: 'skipped',
};

function createVantaServer() {
  const server = new McpServer({
    name: 'vanta-wallet-daemon',
    version: '1.0.0',
  });

  // ═══════════════════════════════════════════
  // READ-ONLY TOOLS (no policy check needed)
  // ═══════════════════════════════════════════

  server.tool(
    'get_balance',
    'Get the ETH balance of a wallet address on Sepolia',
    { address: z.string().describe('Wallet address (0x…)') },
    async ({ address }) => {
      try {
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'RPC_URL not configured' }) }] };
        }
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1,
          }),
        });
        const { result } = await res.json();
        const wei = BigInt(result ?? '0x0');
        const eth = Number(wei) / 1e18;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ address, balanceWei: wei.toString(), balanceEth: eth.toFixed(6), balanceUsd: (eth * ETH_PRICE_USD).toFixed(2) }) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: 'text' as const, text: `Error fetching balance: ${(e as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_transaction_history',
    'Get recent transactions processed through VANTA for this wallet',
    {
      address: z.string().describe('Wallet address'),
      limit: z.number().default(20).describe('Max transactions to return'),
    },
    async ({ address, limit }) => {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('address', address.toLowerCase())
        .single();

      if (!user) {
        return { content: [{ type: 'text' as const, text: 'User not registered in VANTA. Connect wallet first.' }], isError: true };
      }

      const { data: txs } = await supabaseAdmin
        .from('transactions')
        .select('id, from_address, to_address, value, value_usd, tier, status, risk_score, policy_reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { content: [{ type: 'text' as const, text: JSON.stringify(txs ?? []) }] };
    }
  );

  server.tool(
    'check_address_risk',
    'Check if an address is flagged as scam or risky in VANTA database',
    { address: z.string().describe('Address to check') },
    async ({ address }) => {
      const { data } = await supabaseAdmin
        .from('flagged_addresses')
        .select('reason, source, flagged_at')
        .eq('address', address.toLowerCase())
        .single();

      return {
        content: [{
          type: 'text' as const,
          text: data
            ? JSON.stringify({ flagged: true, reason: data.reason, source: data.source })
            : JSON.stringify({ flagged: false, address }),
        }],
      };
    }
  );

  server.tool(
    'get_policy_rules',
    'Get the active security policy rules for this wallet',
    { address: z.string().describe('Wallet address') },
    async ({ address }) => {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, protection_level')
        .eq('address', address.toLowerCase())
        .single();

      if (!user) {
        return { content: [{ type: 'text' as const, text: 'User not registered.' }], isError: true };
      }

      const { data: rules } = await supabaseAdmin
        .from('rules')
        .select('type, enabled, config, sort_order')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .order('sort_order');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ protectionLevel: user.protection_level, rules: rules ?? [] }) }],
      };
    }
  );

  // ═══════════════════════════════════════════
  // GATED TOOLS (go through full pipeline)
  // ═══════════════════════════════════════════

  server.tool(
    'send_transaction',
    'Send ETH to an address. Goes through VANTA policy engine + AI scanner. May require human confirmation (Tier 2) or be blocked (Tier 3).',
    {
      from: z.string().describe('Sender wallet address'),
      to: z.string().describe('Recipient address'),
      value: z.string().describe('Amount in wei (e.g. "1000000000000000000" for 1 ETH)'),
      data: z.string().optional().describe('Calldata for contract interactions'),
      chain_id: z.number().default(11155111).describe('Chain ID (default: 11155111 Sepolia)'),
      skip_ai_scan: z.boolean().default(true).describe('If true, use policy-only mode (recommended for deterministic simulation)'),
    },
    async ({ from, to, value, data, chain_id, skip_ai_scan }) => {
      return await processTransactionViaPipeline({
        from,
        to,
        value,
        data,
        chainId: chain_id,
        agentId: 'mcp-agent',
        skipAiScan: skip_ai_scan,
      });
    }
  );

  server.tool(
    'send_eth',
    'Send ETH to an address (simplified — specify amount in ETH, not wei)',
    {
      from: z.string().describe('Your wallet address'),
      to: z.string().describe('Recipient address'),
      amount_eth: z.string().describe('Amount of ETH to send (e.g. "0.1")'),
      skip_ai_scan: z.boolean().default(true).describe('If true, use policy-only mode (recommended for deterministic simulation)'),
    },
    async ({ from, to, amount_eth, skip_ai_scan }) => {
      const valueWei = String(Math.round(parseFloat(amount_eth) * 1e18));
      return await processTransactionViaPipeline({
        from,
        to,
        value: valueWei,
        chainId: 11155111,
        agentId: 'mcp-agent',
        skipAiScan: skip_ai_scan,
      });
    }
  );

  return server;
}

// The full VANTA transaction pipeline — same logic as POST /api/transactions/submit
async function processTransactionViaPipeline(input: {
  from: string;
  to: string;
  value: string;
  data?: string;
  chainId: number;
  agentId: string;
  skipAiScan?: boolean;
}) {
  const { from, to, value, data, chainId, agentId, skipAiScan = true } = input;

  // 1. Resolve user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, world_id_verified')
    .eq('address', from.toLowerCase())
    .single();

  if (!user) {
    return { content: [{ type: 'text' as const, text: 'User not registered in VANTA. Connect wallet in the VANTA dashboard first.' }], isError: true };
  }

  // 2. Load rules
  const { data: rules } = await supabaseAdmin
    .from('rules')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');

  // 3. Daily spend
  const today = new Date().toISOString().split('T')[0];
  let spend: { total_usd: number } | null = null;
  try {
    const res = await supabaseAdmin
      .from('daily_spend')
      .select('total_usd')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    spend = res.data;
  } catch {
    // table may not exist yet
  }

  const dailySpendUsd = Number(spend?.total_usd ?? 0);
  const txValueUsd = (Number(value) / 1e18) * ETH_PRICE_USD;

  // 4. Policy engine
  const policyResult = evaluateTransaction(
    { from, to, value, data, chainId },
    rules ?? [],
    dailySpendUsd,
    ETH_PRICE_USD,
    !!user.world_id_verified
  );

  // 5. AI scanner
  const scanResult = skipAiScan
    ? SKIPPED_SCAN_RESULT
    : await scanTransaction({ from, to, value, data, chainId, agentId }, ETH_PRICE_USD);

  // 6. Scanner can escalate
  let finalTier = policyResult.tier;
  if (scanResult.recommendation === 'block' && finalTier < 3) finalTier = 3;
  else if (scanResult.recommendation === 'flag' && finalTier < 2) finalTier = 2;

  const status = finalTier === 3 ? 'blocked' : finalTier === 1 ? 'approved' : 'pending';

  // 7. Insert transaction (triggers Supabase Realtime → dashboard confirmation modal)
  const { data: tx, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: user.id,
      from_address: from.toLowerCase(),
      to_address: to.toLowerCase(),
      value: String(value),
      value_usd: txValueUsd,
      calldata: data ?? null,
      chain_id: chainId,
      agent_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId) ? agentId : null,
      tier: finalTier,
      status,
      matched_rules: policyResult.matchedRules,
      policy_reason: policyResult.reason,
      risk_score: scanResult.riskScore,
      scan_checks: scanResult.checks,
      scan_recommendation: scanResult.recommendation,
      scan_reasoning: scanResult.reasoning,
    })
    .select('id, tier, status')
    .single();

  if (error || !tx) {
    return { content: [{ type: 'text' as const, text: `Failed to process transaction: ${error?.message ?? 'Unknown error'}` }], isError: true };
  }

  // 8. Update daily spend for auto-approved
  if (status === 'approved') {
    await supabaseAdmin
      .from('daily_spend')
      .upsert(
        { user_id: user.id, date: today, total_usd: dailySpendUsd + txValueUsd },
        { onConflict: 'user_id,date' }
      );
  }

  // 9. Return result to the agent
  if (status === 'approved') {
    return {
      content: [{
        type: 'text' as const,
        text: `Transaction AUTO-APPROVED (Tier 1). ID: ${tx.id}. Amount: ${(Number(value) / 1e18).toFixed(6)} ETH ($${txValueUsd.toFixed(2)}). Policy: ${policyResult.reason}. Risk score: ${scanResult.riskScore}/100.`,
      }],
    };
  }

  if (status === 'pending') {
    return {
      content: [{
        type: 'text' as const,
        text: `Transaction REQUIRES HUMAN CONFIRMATION (Tier ${finalTier}). ID: ${tx.id}. Amount: ${(Number(value) / 1e18).toFixed(6)} ETH ($${txValueUsd.toFixed(2)}). Reason: ${policyResult.reason}. Risk score: ${scanResult.riskScore}/100. The wallet owner has been notified via the VANTA dashboard and must approve before this transaction can proceed.`,
      }],
    };
  }

  // blocked
  return {
    content: [{
      type: 'text' as const,
      text: `Transaction BLOCKED (Tier 3). ID: ${tx.id}. Reason: ${policyResult.reason}. Scanner: ${scanResult.reasoning}. Risk score: ${scanResult.riskScore}/100. This transaction cannot proceed.`,
    }],
    isError: true,
  };
}

// ═══════════════════════════════════════════
// Next.js Route Handler — Streamable HTTP
// ═══════════════════════════════════════════

// Stateless mode: each request gets a fresh transport+server pair
// (fine for hackathon; production would use stateful sessions)

export async function POST(req: Request) {
  const server = createVantaServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: Request) {
  const server = createVantaServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function DELETE(req: Request) {
  return new Response(null, { status: 405 });
}
