import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createResource, GET as listResources } from '@/app/api/resources/route';

vi.mock('@/lib/db', () => ({
  db: {
    resource: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    package: {
      findUnique: vi.fn(),
    },
    unitPrice: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/apiSession', () => ({
  getApiSession: vi.fn(),
}));

vi.mock('@/lib/audit/logger', () => ({
  logEvent: vi.fn(),
}));

vi.mock('@/lib/provisioning/provisionService', () => ({
  runProvisionAsync: vi.fn(),
}));

import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';

const mockedGetApiSession = vi.mocked(getApiSession);

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const { NextResponse } = await import('next/server');
    mockedGetApiSession.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const res = await createResource(
      makePostRequest({ packageId: 'pkg-1', name: 'my-vm', regionCode: 'dhaka-1' }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 403 when admin attempts to provision', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' } as never);

    const res = await createResource(
      makePostRequest({ packageId: 'pkg-1', name: 'my-vm', regionCode: 'dhaka-1' }),
    );

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);

    const res = await createResource(
      new NextRequest('http://localhost/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid provision body', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);

    const res = await createResource(makePostRequest({ name: 'bad name!!!' }));

    expect(res.status).toBe(400);
  });
});

describe('GET /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid status filter', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);

    const res = await listResources(
      new NextRequest('http://localhost/api/resources?status=BOGUS'),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid status/i);
  });

  it('returns resources when status filter is valid', async () => {
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);
    vi.mocked(db.resource.findMany).mockResolvedValue([] as never);

    const res = await listResources(
      new NextRequest('http://localhost/api/resources?status=ACTIVE'),
    );

    expect(res.status).toBe(200);
    expect(db.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
      }),
    );
  });
});
