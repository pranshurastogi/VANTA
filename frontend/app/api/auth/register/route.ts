import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { address, dynamicUserId } = await req.json();

  if (!address || !dynamicUserId) {
    return NextResponse.json({ error: 'Missing address or dynamicUserId' }, { status: 400 });
  }

  // TODO: persist user registration to your DB / store
  // e.g. upsert { address, dynamicUserId } in your users table

  return NextResponse.json({ ok: true, address, dynamicUserId });
}
