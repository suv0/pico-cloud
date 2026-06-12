import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceStatus } from '@prisma/client';
import {
  recoverInterruptedProvisions,
  RECOVERY_FAILURE_REASON,
} from '@/lib/provisioning/recoverInterruptedProvisions';

vi.mock('@/lib/audit/logger', () => ({
  logEvent: vi.fn(),
}));

import { logEvent } from '@/lib/audit/logger';

const mockedLogEvent = vi.mocked(logEvent);

function makeDb(stuck: Array<{ id: string; userId: string; status: ResourceStatus }>) {
  const byId = new Map(stuck.map((r) => [r.id, { ...r }]));
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  return {
    resource: {
      findMany: vi.fn().mockResolvedValue(stuck),
      findUniqueOrThrow: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        const row = byId.get(where.id);
        if (!row) return Promise.reject(new Error('not found'));
        return Promise.resolve(row);
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ id: where.id, data });
        const row = byId.get(where.id);
        if (row && data.status) {
          row.status = data.status as ResourceStatus;
        }
        return Promise.resolve({});
      }),
    },
    _updates: updates,
  };
}

describe('recoverInterruptedProvisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions PENDING → FAILED with audit event', async () => {
    const db = makeDb([{ id: 'r1', userId: 'u1', status: ResourceStatus.PENDING }]);

    const count = await recoverInterruptedProvisions(db);

    expect(count).toBe(1);
    expect(db.resource.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({
        status: ResourceStatus.FAILED,
        failureReason: RECOVERY_FAILURE_REASON,
      }),
    });
    expect(mockedLogEvent).toHaveBeenCalledWith(
      'resource',
      'r1',
      'RESOURCE_PROVISIONING_FAILED',
      RECOVERY_FAILURE_REASON,
      'u1',
    );
  });

  it('transitions PROVISIONING → FAILED with audit event', async () => {
    const db = makeDb([{ id: 'r2', userId: 'u2', status: ResourceStatus.PROVISIONING }]);

    const count = await recoverInterruptedProvisions(db);

    expect(count).toBe(1);
    expect(db.resource.update).toHaveBeenCalledTimes(1);
    expect(mockedLogEvent).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when no in-progress resources (ACTIVE/FAILED untouched)', async () => {
    const db = makeDb([]);

    const count = await recoverInterruptedProvisions(db);

    expect(count).toBe(0);
    expect(db.resource.update).not.toHaveBeenCalled();
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });

  it('recovers multiple stuck resources in one pass', async () => {
    const db = makeDb([
      { id: 'a', userId: 'u1', status: ResourceStatus.PENDING },
      { id: 'b', userId: 'u2', status: ResourceStatus.PROVISIONING },
    ]);

    const count = await recoverInterruptedProvisions(db);

    expect(count).toBe(2);
    expect(db.resource.update).toHaveBeenCalledTimes(2);
    expect(mockedLogEvent).toHaveBeenCalledTimes(2);
  });
});
