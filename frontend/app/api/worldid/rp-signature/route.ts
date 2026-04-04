import { NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit-core/signing';

/**
 * POST /api/worldid/rp-signature
 * Generates an RP signature for World ID proof requests.
 * The signing key NEVER leaves the server.
 */
export async function POST(request: Request): Promise<Response> {
  const signingKey = process.env.WORLD_PK;
  if (!signingKey) {
    return NextResponse.json(
      { error: 'World ID signing key not configured (WORLD_PK)' },
      { status: 503 },
    );
  }

  try {
    const { action } = await request.json();

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid action' },
        { status: 400 },
      );
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: signingKey,
      action,
    });

    return NextResponse.json({
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error('RP signature generation failed:', e);
    return NextResponse.json(
      { error: 'Failed to generate RP signature' },
      { status: 500 },
    );
  }
}
