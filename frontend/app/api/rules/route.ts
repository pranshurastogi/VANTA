import { NextRequest, NextResponse } from 'next/server';

const DYNAMIC_API = `https://app.dynamicauth.com/api/v0/environments/${process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID}/waas/policies`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DYNAMIC_AUTH_TOKEN}`,
  };
}

// Create or update Dynamic policy rules
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rulesToAdd = [], rulesToUpdate = [] } = body;

  const payload: Record<string, unknown> = {};
  if (rulesToAdd.length) payload.rulesToAdd = rulesToAdd;
  if (rulesToUpdate.length) payload.rulesToUpdate = rulesToUpdate;

  const method = rulesToUpdate.length && !rulesToAdd.length ? 'PUT' : 'POST';

  const res = await fetch(DYNAMIC_API, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

// Delete Dynamic policy rules
export async function DELETE(req: NextRequest) {
  const { ruleIdsToDelete } = await req.json();

  const res = await fetch(DYNAMIC_API, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ruleIdsToDelete }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
