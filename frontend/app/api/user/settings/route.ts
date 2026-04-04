import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address, confirmation_method, tier3_escalation, protection_level, email } = body;

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('address', normalized)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Build updates — only include fields that were actually sent
  const updates: Record<string, string | null> = {};
  if (confirmation_method) updates.confirmation_method = confirmation_method;
  if (tier3_escalation) updates.tier3_escalation = tier3_escalation;
  if (protection_level) updates.protection_level = protection_level;
  if (email !== undefined) updates.email = email || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Try the full update first
  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    // If a column doesn't exist, retry with only known-safe columns
    if (error.message?.includes('column')) {
      const safeUpdates: Record<string, string | null> = {};
      if (protection_level) safeUpdates.protection_level = protection_level;
      // Try each optional column individually
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'protection_level') continue;
        const { error: colErr } = await supabaseAdmin
          .from('users')
          .update({ [key]: val })
          .eq('id', user.id);
        if (!colErr) safeUpdates[key] = val;
        // If column doesn't exist, skip silently
      }
      return NextResponse.json({ ok: true, partial: true, saved: Object.keys(safeUpdates) });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
