import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
  }

  const { to, txId, amount, toAddress, tier, riskScore, dashboardUrl } = await req.json();

  if (!to || !txId) {
    return NextResponse.json({ error: 'Missing to (email) or txId' }, { status: 400 });
  }

  const tierLabel = tier === 2 ? 'Tier 2 — Needs Confirmation' : 'Tier 3 — Blocked';
  const tierColor = tier === 2 ? '#F59E0B' : '#EF4444';
  const actionUrl = dashboardUrl || 'https://vanta.app/dashboard';

  try {
    const { data, error } = await resend.emails.send({
      from: 'VANTA Security <noreply@updates.resend.dev>',
      to: [to],
      subject: `🛡️ VANTA: Transaction requires your attention (${tierLabel})`,
      html: `
        <div style="font-family: 'SF Mono', monospace, sans-serif; max-width: 480px; margin: 0 auto; background: #0A0A0C; color: #E4E4E7; padding: 32px; border-radius: 16px; border: 1px solid #27272A;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 40px; height: 40px; background: linear-gradient(135deg, #2DD4BF, #14B8A6); border-radius: 10px; line-height: 40px; font-size: 20px; color: #0A0A0C; font-weight: bold;">V</div>
          </div>

          <h2 style="text-align: center; font-size: 18px; margin-bottom: 4px; color: #FAFAFA;">Transaction Request</h2>
          <p style="text-align: center; font-size: 12px; color: #71717A; margin-bottom: 24px;">An AI agent submitted a transaction that needs your review</p>

          <div style="background: #18181B; border: 1px solid #27272A; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 16px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${tierColor}20; color: ${tierColor};">${tierLabel}</span>
            </div>

            <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 4px;">${amount || 'Unknown amount'}</div>
            <div style="text-align: center; font-size: 12px; color: #71717A; margin-bottom: 16px;">→ ${toAddress ? toAddress.slice(0, 10) + '…' + toAddress.slice(-6) : 'Unknown'}</div>

            <div style="border-top: 1px solid #27272A; padding-top: 12px;">
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="color: #71717A; padding: 4px 0;">TX ID</td><td style="text-align: right; font-family: monospace;">${txId.slice(0, 12)}…</td></tr>
                <tr><td style="color: #71717A; padding: 4px 0;">Risk Score</td><td style="text-align: right;">${riskScore ?? '—'}/100</td></tr>
                <tr><td style="color: #71717A; padding: 4px 0;">Network</td><td style="text-align: right;">Sepolia</td></tr>
              </table>
            </div>
          </div>

          <a href="${actionUrl}" style="display: block; text-align: center; background: #2DD4BF; color: #0A0A0C; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
            Review in Dashboard
          </a>

          <p style="text-align: center; font-size: 11px; color: #52525B; margin-top: 24px;">
            VANTA — Verifiable Autonomous Notary for Transaction Assurance
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent: true, id: data?.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
