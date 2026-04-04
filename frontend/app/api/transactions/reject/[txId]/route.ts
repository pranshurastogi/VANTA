import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  const { txId } = await params;

  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('id, status')
    .eq('id', txId)
    .single();

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (tx.status !== 'pending') {
    return NextResponse.json({ error: `Transaction is already ${tx.status}` }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('transactions')
    .update({ status: 'rejected' })
    .eq('id', txId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ txId, status: 'rejected' });
}
