import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceStatus } from '@prisma/client';
import { markProvisionFailed } from '@/lib/provisioning/provisionService';

vi.mock('@/lib/db', () => ({
  db: {
    resource: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit/logger', () => ({
  logEvent: vi.fn(),
}));

vi.mock('@/lib/provisioning/transitionResourceStatus', () => ({
  transitionResourceStatus: vi.fn(),
}));

import { db } from '@/lib/db';
import { logEvent } from '@/lib/audit/logger';
import { transitionResourceStatus } from '@/lib/provisioning/transitionResourceStatus';

const mockedFindUnique = vi.mocked(db.resource.findUnique);
const mockedLogEvent = vi.mocked(logEvent);
const mockedTransition = vi.mocked(transitionResourceStatus);

describe('markProvisionFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions PROVISIONING → FAILED and logs audit event', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      status: ResourceStatus.PROVISIONING,
    } as never);

    await markProvisionFailed('r1', 'Cloud API timeout');

    expect(mockedTransition).toHaveBeenCalledWith(db, 'r1', ResourceStatus.FAILED, {
      failureReason: 'Cloud API timeout',
    });
    expect(mockedLogEvent).toHaveBeenCalledWith(
      'resource',
      'r1',
      'RESOURCE_PROVISIONING_FAILED',
      'Cloud API timeout',
      'u1',
    );
  });

  it('does nothing when resource is already ACTIVE', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'r2',
      userId: 'u2',
      status: ResourceStatus.ACTIVE,
    } as never);

    await markProvisionFailed('r2', 'Should not apply');

    expect(mockedTransition).not.toHaveBeenCalled();
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });

  it('does nothing when resource is already FAILED', async () => {
    mockedFindUnique.mockResolvedValue({
      id: 'r3',
      userId: 'u3',
      status: ResourceStatus.FAILED,
    } as never);

    await markProvisionFailed('r3', 'Should not apply');

    expect(mockedTransition).not.toHaveBeenCalled();
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });

  it('no-ops when resource row is missing', async () => {
    mockedFindUnique.mockResolvedValue(null);

    await markProvisionFailed('missing', 'Reason');

    expect(mockedTransition).not.toHaveBeenCalled();
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
});
