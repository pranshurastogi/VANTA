import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const WORLD_RP_ID = process.env.WORLD_RP_ID;

/**
 * POST /api/worldid/verify
 * Server-side World ID proof verification.
 *
 * 1. Forwards proof payload to World Developer Portal for cryptographic verification
 * 2. Checks nullifier uniqueness (Sybil resistance)
 * 3. Stores nullifier + marks user as verified in Supabase
 *
 * This satisfies the prize requirement: "Proof validation occurs in a web backend"
 */
export async function POST(request: Request): Promise<Response> {
  if (!WORLD_RP_ID) {
    return NextResponse.json(
      { error: 'World ID not configured (WORLD_RP_ID)' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { address, idkitResponse } = body;

    if (!address || !idkitResponse) {
      return NextResponse.json(
        { error: 'Missing address or idkitResponse' },
        { status: 400 },
      );
    }

    const normalized = address.toLowerCase();

    // ─── Step 1: Forward proof to World Developer Portal for verification ───
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${WORLD_RP_ID}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(idkitResponse),
      },
    );

    if (!verifyRes.ok) {
      const errText = await verifyRes.text().catch(() => 'Unknown error');
      console.error('World ID verification failed:', verifyRes.status, errText);
      return NextResponse.json(
        { error: 'World ID proof verification failed', detail: errText },
        { status: 400 },
      );
    }

    const verifyResult = await verifyRes.json();

    // ─── Step 2: Extract nullifier(s) and check uniqueness ───
    const responses = idkitResponse.responses ?? [];
    const action = idkitResponse.action ?? 'verify-human';

    for (const resp of responses) {
      const nullifier = resp.nullifier;
      if (!nullifier) continue;

      // Convert 0x hex nullifier to decimal string for storage
      // (PostgreSQL NUMERIC(78,0) avoids hex casing issues)
      const nullifierDecimal = BigInt(nullifier).toString();

      // Check if this nullifier was already used for this action
      const { data: existing } = await supabaseAdmin
        .from('world_id_nullifiers')
        .select('id')
        .eq('nullifier', nullifierDecimal)
        .eq('action', action)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'This World ID has already been used for this action. One human, one verification.' },
          { status: 409 },
        );
      }

      // Store nullifier
      await supabaseAdmin.from('world_id_nullifiers').insert({
        nullifier: nullifierDecimal,
        action,
        address: normalized,
        credential_type: resp.identifier ?? 'orb',
        protocol_version: idkitResponse.protocol_version ?? '4.0',
      });
    }

    // ─── Step 3: Mark user as World ID verified in users table ───
    try {
      await supabaseAdmin
        .from('users')
        .update({ world_id_verified: true })
        .eq('address', normalized);
    } catch {
      // Column may not exist — non-fatal
    }

    // ─── Step 4: Return success with verification metadata ───
    return NextResponse.json({
      success: true,
      verified: true,
      nullifier_count: responses.length,
      credential_types: responses.map((r: { identifier?: string }) => r.identifier ?? 'orb'),
      protocol_version: idkitResponse.protocol_version,
      verify_result: verifyResult,
    });
  } catch (e) {
    console.error('World ID verify route error:', e);
    return NextResponse.json(
      { error: 'Internal verification error' },
      { status: 500 },
    );
  }
}
