import { describe, it, expect } from 'vitest';
import { ResourceStatus } from '@prisma/client';
import { canRetryProvision } from '@/lib/provisioning/retryProvision';

describe('canRetryProvision', () => {
  it('allows retry when status is FAILED', () => {
    expect(canRetryProvision(ResourceStatus.FAILED)).toBe(true);
  });

  it('rejects retry for non-FAILED statuses', () => {
    const nonFailed: ResourceStatus[] = [
      ResourceStatus.PENDING,
      ResourceStatus.PROVISIONING,
      ResourceStatus.ACTIVE,
    ];
    for (const status of nonFailed) {
      expect(canRetryProvision(status)).toBe(false);
    }
  });
});
