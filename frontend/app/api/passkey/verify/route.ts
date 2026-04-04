import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { supabaseAdmin } from '@/lib/supabase/server';

function getRpId(req: NextRequest): string {
  const host = req.headers.get('host') ?? 'localhost';
  return host.split(':')[0];
}

function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

// Step 1: Generate authentication options
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  // Get stored passkeys for this user
  const { data: credentials } = await supabaseAdmin
    .from('passkeys')
    .select('credential_id')
    .eq('address', normalized);

  if (!credentials || credentials.length === 0) {
    return NextResponse.json({ error: 'No passkeys registered for this address' }, { status: 404 });
  }

  const allowCredentials = credentials.map((c) => ({
    id: c.credential_id,
    transports: ['internal' as const],
  }));

  const options = await generateAuthenticationOptions({
    rpID: getRpId(req),
    allowCredentials,
    userVerification: 'required',
  });

  // Store challenge for verification
  await supabaseAdmin
    .from('passkey_challenges')
    .upsert(
      { address: normalized, challenge: options.challenge, type: 'authentication', created_at: new Date().toISOString() },
      { onConflict: 'address' }
    );

  return NextResponse.json(options);
}

// Step 2: Verify authentication response
export async function POST(req: NextRequest) {
  const { address, response: authResponse } = await req.json();
  if (!address || !authResponse) {
    return NextResponse.json({ error: 'Missing address or response' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  // Get challenge
  const { data: challengeRow } = await supabaseAdmin
    .from('passkey_challenges')
    .select('challenge')
    .eq('address', normalized)
    .single();

  if (!challengeRow) {
    return NextResponse.json({ error: 'No authentication challenge found' }, { status: 400 });
  }

  // Get the credential that was used
  const { data: credRow } = await supabaseAdmin
    .from('passkeys')
    .select('credential_id, public_key, counter')
    .eq('credential_id', authResponse.id)
    .eq('address', normalized)
    .single();

  if (!credRow) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: credRow.credential_id,
        publicKey: new Uint8Array(Buffer.from(credRow.public_key, 'base64')),
        counter: credRow.counter,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Update counter (replay protection)
    await supabaseAdmin
      .from('passkeys')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('credential_id', credRow.credential_id);

    // Clean up challenge
    await supabaseAdmin.from('passkey_challenges').delete().eq('address', normalized);

    return NextResponse.json({
      verified: true,
      credentialId: credRow.credential_id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
