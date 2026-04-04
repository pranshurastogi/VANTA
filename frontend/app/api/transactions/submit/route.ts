import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evaluateTransaction } from '@/lib/policyEngine';
import { scanTransaction } from '@/lib/aiScanner';

const ETH_PRICE_USD = 2400; // TODO: fetch live from CoinGecko

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { from, to, value, data, chainId, agentId } = body;

  if (!from || !to || value === undefined) {
    return NextResponse.json({ error: 'Missing required fields: from, to, value' }, { status: 400 });
  }

  // 1. Resolve user — auto-register if missing
  // Try with email column first, fall back without it if column doesn't exist
  let user: { id: string; email?: string | null } | null = null;

  const { data: found, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('address', from.toLowerCase())
    .single();

  if (userErr?.code === 'PGRST301') {
    return NextResponse.json(
      { error: 'Supabase service role key missing or invalid. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
      { status: 500 }
    );
  }

  if (found) {
    user = found;
    // Try to fetch email (column may not exist)
    try {
      const { data: withEmail } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', found.id)
        .single();
      if (withEmail) user.email = (withEmail as { email?: string }).email ?? null;
    } catch { /* email column doesn't exist — that's fine */ }
  }

  // Auto-register: wallet is connected on frontend but row doesn't exist yet
  if (!user) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('users')
      .insert({ address: from.toLowerCase(), protection_level: 'balanced' })
      .select('id')
      .single();

    if (createErr || !created) {
      return NextResponse.json(
        { error: `Could not register user: ${createErr?.message ?? 'Unknown error'}` },
        { status: 500 }
      );
    }
    user = { ...created, email: null };
  }

  // 2. Load rules
  const { data: rules } = await supabaseAdmin
    .from('rules')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');

  // 3. Load today's spend (daily_spend table may not exist yet — that's ok)
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
    // table may not exist
  }

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
      chain_id: chainId ?? 11155111,
      agent_id: agentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId) ? agentId : null,
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

  // 9. Send email notification for Tier 2/3 (non-blocking)
  if ((status === 'pending' || status === 'blocked') && user.email) {
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    fetch(`${origin}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        txId: tx.id,
        amount: `${(Number(value) / 1e18).toFixed(4)} ETH ($${txValueUsd.toFixed(2)})`,
        toAddress: to,
        tier: finalTier,
        riskScore: scanResult.riskScore,
        dashboardUrl: `${origin}/dashboard`,
      }),
    }).catch(() => {}); // fire-and-forget
  }

  // 10. Update daily spend for auto-approved transactions (non-fatal if table missing)
  if (status === 'approved') {
    try {
      await supabaseAdmin
        .from('daily_spend')
        .upsert(
          { user_id: user.id, date: today, total_usd: dailySpendUsd + txValueUsd },
          { onConflict: 'user_id,date' }
        );
    } catch {
      // daily_spend table may not exist yet — non-fatal
    }
  }

  return NextResponse.json({
    txId: tx.id,
    tier: tx.tier,
    status: tx.status,
    policyResult,
    scanResult,
  });
}
