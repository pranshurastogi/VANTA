import { NextRequest, NextResponse } from 'next/server';

const DYNAMIC_API = `https://app.dynamicauth.com/api/v0/environments/${process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID}/waas/policies`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DYNAMIC_AUTH_TOKEN}`,
  };
}

function checkToken() {
  if (!process.env.DYNAMIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: 'DYNAMIC_AUTH_TOKEN not configured. Get it from Dynamic Dashboard → Developer → API.' },
      { status: 503 }
    );
  }
  return null;
}

// Create or update Dynamic policy rules
export async function POST(req: NextRequest) {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  const body = await req.json();
  const { rulesToAdd = [], rulesToUpdate = [] } = body;

  const payload: Record<string, unknown> = {};
  if (rulesToAdd.length) payload.rulesToAdd = rulesToAdd;
  if (rulesToUpdate.length) payload.rulesToUpdate = rulesToUpdate;

  const method = rulesToUpdate.length && !rulesToAdd.length ? 'PUT' : 'POST';

  try {
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
  } catch (e: unknown) {
    return NextResponse.json({ error: `Dynamic API unreachable: ${(e as Error).message}` }, { status: 502 });
  }
}

// Delete Dynamic policy rules
export async function DELETE(req: NextRequest) {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  const { ruleIdsToDelete } = await req.json();

  try {
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
  } catch (e: unknown) {
    return NextResponse.json({ error: `Dynamic API unreachable: ${(e as Error).message}` }, { status: 502 });
  }
}

// GET — check Dynamic API connectivity + fetch current policies
export async function GET() {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    const res = await fetch(DYNAMIC_API, { headers: authHeaders() });
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: await res.text() }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ connected: true, policies: data });
  } catch (e: unknown) {
    return NextResponse.json({ connected: false, error: (e as Error).message }, { status: 502 });
  }
}
