import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const ETH_PRICE_USD = 2400;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  const { txId } = await params;
  const { method } = await req.json();

  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .single();

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (tx.status !== 'pending') {
    return NextResponse.json({ error: `Transaction is already ${tx.status}` }, { status: 400 });
  }

  // Update to confirmed (triggers realtime on frontend)
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_method: method ?? 'passkey',
    })
    .eq('id', txId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update daily spend
  const today = new Date().toISOString().split('T')[0];
  const { data: spend } = await supabaseAdmin
    .from('daily_spend')
    .select('total_usd')
    .eq('user_id', tx.user_id)
    .eq('date', today)
    .single();

  const txValueUsd = (Number(tx.value) / 1e18) * ETH_PRICE_USD;
  await supabaseAdmin
    .from('daily_spend')
    .upsert(
      { user_id: tx.user_id, date: today, total_usd: Number(spend?.total_usd ?? 0) + txValueUsd },
      { onConflict: 'user_id,date' }
    );

  // TODO: execute via Dynamic Node SDK
  // const txHash = await signAndSendTransaction(tx.from_address, tx.to_address, tx.value, tx.calldata)
  // await supabaseAdmin.from('transactions').update({ tx_hash: txHash }).eq('id', txId)

  return NextResponse.json({ txId, status: 'confirmed' });
}
