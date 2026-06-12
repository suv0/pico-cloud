import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth/session', () => ({
  getValidatedSessionForRoute: vi.fn(),
}));

import { getValidatedSessionForRoute } from '@/lib/auth/session';
import { getApiAdminSession, isAdminRole } from '@/lib/auth/requireAdmin';

const mockedGetValidatedSessionForRoute = vi.mocked(getValidatedSessionForRoute);

describe('isAdminRole', () => {
  it('returns true only for ADMIN', () => {
    expect(isAdminRole('ADMIN')).toBe(true);
  });

  it('returns false for CUSTOMER', () => {
    expect(isAdminRole('CUSTOMER')).toBe(false);
  });
});

describe('getApiAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedGetValidatedSessionForRoute.mockResolvedValue(null);

    const result = await getApiAdminSession();
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401);
    }
  });

  it('returns 403 for CUSTOMER role', async () => {
    mockedGetValidatedSessionForRoute.mockResolvedValue({
      userId: 'u1',
      email: 'customer@demo.pico',
      role: 'CUSTOMER',
    });

    const result = await getApiAdminSession();
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403);
    }
  });

  it('returns admin session for ADMIN role', async () => {
    const adminSession = {
      userId: 'a1',
      email: 'admin@test.com',
      role: 'ADMIN' as const,
    };
    mockedGetValidatedSessionForRoute.mockResolvedValue(adminSession);

    const result = await getApiAdminSession();
    expect(result).toEqual(adminSession);
  });
});
