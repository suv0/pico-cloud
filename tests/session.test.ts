import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDestroy, mockSave, mockFindUnique } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockSave: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue({
    userId: 'stale-user-id',
    email: 'stale@demo.pico',
    destroy: mockDestroy,
    save: mockSave,
  }),
}));

import { getValidatedSession, getValidatedSessionForRoute } from '@/lib/auth/session';

describe('getValidatedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
  });

  it('returns null without mutating cookies when DB user is missing', async () => {
    const result = await getValidatedSession();

    expect(result).toBeNull();
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns user when DB record exists', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@demo.pico',
      role: 'CUSTOMER',
    });

    const result = await getValidatedSession();

    expect(result).toEqual({
      userId: 'user-1',
      email: 'user@demo.pico',
      role: 'CUSTOMER',
    });
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('getValidatedSessionForRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
  });

  it('clears stale cookie when DB user is missing', async () => {
    const result = await getValidatedSessionForRoute();

    expect(result).toBeNull();
    expect(mockDestroy).toHaveBeenCalledOnce();
    expect(mockSave).toHaveBeenCalledOnce();
  });
});
