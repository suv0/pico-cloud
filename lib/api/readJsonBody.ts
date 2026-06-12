import { NextRequest } from 'next/server';

export async function readJsonBody(
  req: NextRequest,
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  try {
    const body: unknown = await req.json();
    return { ok: true, body };
  } catch {
    return { ok: false, error: 'Request body must be valid JSON' };
  }
}
