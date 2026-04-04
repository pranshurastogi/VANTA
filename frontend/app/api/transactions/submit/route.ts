import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evaluateTransaction } from '@/lib/policyEngine';
import { scanTransaction } from '@/lib/aiScanner';

const ETH_PRICE_USD = 2400; // TODO: fetch live from CoinGecko

export async function POST(req: NextRequest) {
  const { from, to, value, data, chainId, agentId } = await req.json();

  if (!from || !to || value === undefined) {
    return NextResponse.json({ error: 'Missing required fields: from, to, value' }, { status: 400 });
  }

  // 1. Resolve user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('address', from.toLowerCase())
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not registered. Connect wallet first.' }, { status: 404 });
  }

  // 2. Load rules
  const { data: rules } = await supabaseAdmin
    .from('rules')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');

  // 3. Load today's spend
  const today = new Date().toISOString().split('T')[0];
  const { data: spend } = await supabaseAdmin
    .from('daily_spend')
    .select('total_usd')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  const dailySpendUsd = Number(spend?.total_usd ?? 0);
  const txValueUsd = (Number(value) / 1e18) * ETH_PRICE_USD;

  // 4. Policy engine
  const policyResult = evaluateTransaction(
    { from, to, value: String(value), data, chainId },
    rules ?? [],
    dailySpendUsd,
    ETH_PRICE_USD
  );

  // 5. AI scanner
  const scanResult = await scanTransaction(
    { from, to, value: String(value), data, chainId, agentId },
    ETH_PRICE_USD
  );

  // 6. Scanner can escalate tier
  let finalTier = policyResult.tier;
  if (scanResult.recommendation === 'block' && finalTier < 3) finalTier = 3;
  else if (scanResult.recommendation === 'flag' && finalTier < 2) finalTier = 2;

  // 7. Derive status
  const status =
    finalTier === 3 ? 'blocked' :
    finalTier === 1 ? 'approved' :
    'pending';

  // 8. Insert transaction (triggers realtime on frontend)
  const { data: tx, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: user.id,
      from_address: from.toLowerCase(),
      to_address: to.toLowerCase(),
      value: String(value),
      value_usd: txValueUsd,
      calldata: data ?? null,
      chain_id: chainId ?? 1,
      agent_id: agentId ?? null,
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
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  // 9. Update daily spend for auto-approved transactions
  if (status === 'approved') {
    await supabaseAdmin
      .from('daily_spend')
      .upsert(
        { user_id: user.id, date: today, total_usd: dailySpendUsd + txValueUsd },
        { onConflict: 'user_id,date' }
      );
  }

  return NextResponse.json({
    txId: tx.id,
    tier: tx.tier,
    status: tx.status,
    policyResult,
    scanResult,
  });
}
