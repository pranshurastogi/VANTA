import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// RP = Relying Party (your app)
const RP_NAME = 'VANTA';

function getRpId(req: NextRequest): string {
  const host = req.headers.get('host') ?? 'localhost';
  return host.split(':')[0]; // strip port
}

function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

// Step 1: Generate registration options
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  // Get existing passkeys for this user so we can exclude them
  const { data: existing } = await supabaseAdmin
    .from('passkeys')
    .select('credential_id')
    .eq('address', normalized);

  const excludeCredentials = (existing ?? []).map((p) => ({
    id: p.credential_id,
    transports: ['internal' as const],
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(req),
    userName: normalized,
    userDisplayName: `VANTA (${normalized.slice(0, 6)}…${normalized.slice(-4)})`,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Face ID / Touch ID
      userVerification: 'required',
      residentKey: 'preferred',
    },
    excludeCredentials,
  });

  // Store challenge temporarily for verification (keyed by address)
  await supabaseAdmin
    .from('passkey_challenges')
    .upsert(
      { address: normalized, challenge: options.challenge, type: 'registration', created_at: new Date().toISOString() },
      { onConflict: 'address' }
    );

  return NextResponse.json(options);
}

// Step 2: Verify registration response from browser
export async function POST(req: NextRequest) {
  const { address, response: regResponse } = await req.json();
  if (!address || !regResponse) {
    return NextResponse.json({ error: 'Missing address or response' }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  // Retrieve the challenge we stored
  const { data: challengeRow } = await supabaseAdmin
    .from('passkey_challenges')
    .select('challenge')
    .eq('address', normalized)
    .single();

  if (!challengeRow) {
    return NextResponse.json({ error: 'No registration challenge found. Start over.' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: regResponse,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store the credential in Supabase
    const { error } = await supabaseAdmin
      .from('passkeys')
      .insert({
        address: normalized,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        created_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clean up challenge
    await supabaseAdmin.from('passkey_challenges').delete().eq('address', normalized);

    return NextResponse.json({
      verified: true,
      credentialId: credential.id,
      deviceType: credentialDeviceType,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
