import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getCustomerMetrics } from '@/app/api/resources/[id]/metrics/route';

vi.mock('@/lib/db', () => ({
  db: {
    resource: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/apiSession', () => ({
  getApiSession: vi.fn(),
}));

import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';

const mockedFindUnique = vi.mocked(db.resource.findUnique);
const mockedGetApiSession = vi.mocked(getApiSession);

const activePaidResource = {
  id: 'res-1',
  userId: 'user-1',
  status: 'ACTIVE',
  vcpu: 2,
  ramGb: 4,
  invoice: { status: 'PAID' },
};

const activeUnpaidResource = {
  ...activePaidResource,
  invoice: { status: 'UNPAID' },
};

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/resources/[id]/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);
  });

  it('returns 402 when invoice is unpaid', async () => {
    mockedFindUnique.mockResolvedValue(activeUnpaidResource as never);

    const res = await getCustomerMetrics(
      makeRequest('http://localhost/api/resources/res-1/metrics'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(402);
  });

  it('returns metrics for paid active VM', async () => {
    mockedFindUnique.mockResolvedValue(activePaidResource as never);

    const res = await getCustomerMetrics(
      makeRequest('http://localhost/api/resources/res-1/metrics'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cpuPct).toBeGreaterThan(0);
  });
});
