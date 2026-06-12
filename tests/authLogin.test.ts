import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as login } from '@/app/api/auth/login/route';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit/logger', () => ({
  logEvent: vi.fn(),
}));

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedGetSession = vi.mocked(getSession);

function makeLoginRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue({
      userId: undefined,
      email: undefined,
      save: vi.fn(),
    } as never);
  });

  it('returns 401 for unknown email', async () => {
    mockedFindUnique.mockResolvedValue(null);

    const res = await login(
      makeLoginRequest({ email: 'nobody@demo.pico', password: 'wrong' }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid email or password/i);
  });

  it('returns 400 for invalid body', async () => {
    const res = await login(makeLoginRequest({ email: 'not-an-email', password: '' }));

    expect(res.status).toBe(400);
  });
});
