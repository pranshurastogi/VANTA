import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { address, dynamicUserId, protectionLevel } = await req.json();

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  // Check if user already exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('address', normalized)
    .single();

  if (existing) {
    // Update dynamic wallet ID if provided
    if (dynamicUserId) {
      await supabaseAdmin
        .from('users')
        .update({ dynamic_wallet_id: dynamicUserId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return NextResponse.json({ userId: existing.id, existing: true });
  }

  // Create new user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      address: normalized,
      dynamic_wallet_id: dynamicUserId ?? null,
      protection_level: protectionLevel ?? 'balanced',
    })
    .select('id')
    .single();

  if (error || !user) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  // Create default rules for this user
  await supabaseAdmin.rpc('create_default_rules', {
    p_user_id: user.id,
    p_level: protectionLevel ?? 'balanced',
  });

  return NextResponse.json({ userId: user.id, existing: false });
}
