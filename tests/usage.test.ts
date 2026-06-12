import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getCustomerUsage } from '@/app/api/resources/[id]/usage/route';
import { GET as getAdminUsage } from '@/app/api/admin/resources/[id]/usage/route';

vi.mock('@/lib/db', () => ({
  db: {
    resource: {
      findUnique: vi.fn(),
    },
    usageRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/apiSession', () => ({
  getApiSession: vi.fn(),
}));

vi.mock('@/lib/auth/requireAdmin', () => ({
  getApiAdminSession: vi.fn(),
}));

import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { getApiAdminSession } from '@/lib/auth/requireAdmin';

const mockedFindUnique = vi.mocked(db.resource.findUnique);
const mockedFindMany = vi.mocked(db.usageRecord.findMany);
const mockedGetApiSession = vi.mocked(getApiSession);
const mockedGetApiAdminSession = vi.mocked(getApiAdminSession);

const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

const activePaidResource = {
  id: 'res-1',
  userId: 'user-1',
  status: 'ACTIVE',
  vcpu: 2,
  ramGb: 4,
  provisionedAt: fiveDaysAgo,
  invoice: { status: 'PAID' },
};

const activeUnpaidResource = {
  ...activePaidResource,
  invoice: { status: 'UNPAID' },
};

const newPaidResource = {
  ...activePaidResource,
  provisionedAt: tenMinutesAgo,
};

const sampleBuckets = [
  {
    bucketStart: new Date('2026-06-09T10:00:00.000Z'),
    cpuAvgPct: 42,
    memAvgGb: 2.1,
    networkOutMb: 500,
  },
];

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/resources/[id]/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);
    mockedFindMany.mockResolvedValue(sampleBuckets as never);
  });

  it('returns 402 when invoice is unpaid', async () => {
    mockedFindUnique.mockResolvedValue(activeUnpaidResource as never);

    const res = await getCustomerUsage(
      makeRequest('http://localhost/api/resources/res-1/usage'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(402);
  });

  it('returns usage buckets for paid active VM with DB rows', async () => {
    mockedFindUnique.mockResolvedValue(activePaidResource as never);

    const res = await getCustomerUsage(
      makeRequest('http://localhost/api/resources/res-1/usage'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.range).toBe('recent');
    expect(body.state).toBe('ready');
    expect(body.buckets).toHaveLength(1);
    expect(body.buckets[0].cpuAvgPct).toBe(42);
  });

  it('falls back to generated buckets since provisionedAt when DB is empty', async () => {
    mockedFindUnique.mockResolvedValue(activePaidResource as never);
    mockedFindMany.mockResolvedValue([]);

    const res = await getCustomerUsage(
      makeRequest('http://localhost/api/resources/res-1/usage'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe('ready');
    expect(body.buckets.length).toBeGreaterThan(24);
    expect(body.buckets[0].cpuAvgPct).toBeGreaterThan(0);
  });

  it('returns demo sample buckets for VM provisioned minutes ago', async () => {
    mockedFindUnique.mockResolvedValue(newPaidResource as never);
    mockedFindMany.mockResolvedValue([]);

    const res = await getCustomerUsage(
      makeRequest('http://localhost/api/resources/res-1/usage'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe('ready');
    expect(body.mockSample).toBe(true);
    expect(body.buckets.length).toBe(48);
  });
});

describe('GET /api/admin/resources/[id]/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiAdminSession.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' } as never);
    mockedFindMany.mockResolvedValue(sampleBuckets as never);
  });

  it('bypasses payment gate for admin oversight', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'res-1',
      status: 'ACTIVE',
      vcpu: 2,
      ramGb: 4,
      provisionedAt: fiveDaysAgo,
    } as never);

    const res = await getAdminUsage(
      makeRequest('http://localhost/api/admin/resources/res-1/usage'),
      { params: Promise.resolve({ id: 'res-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.buckets).toHaveLength(1);
  });
});
