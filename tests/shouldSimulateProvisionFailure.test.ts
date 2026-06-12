import { describe, it, expect } from 'vitest';
import { shouldSimulateProvisionFailure } from '@/lib/cloud/shouldSimulateProvisionFailure';

describe('shouldSimulateProvisionFailure', () => {
  it('returns true for fail, fail1, and fail-* names', () => {
    expect(shouldSimulateProvisionFailure('fail')).toBe(true);
    expect(shouldSimulateProvisionFailure('fail1')).toBe(true);
    expect(shouldSimulateProvisionFailure('fail-test')).toBe(true);
    expect(shouldSimulateProvisionFailure('fail-example')).toBe(true);
  });

  it('returns false for normal VM names', () => {
    expect(shouldSimulateProvisionFailure('my-web-server')).toBe(false);
    expect(shouldSimulateProvisionFailure('staging-app')).toBe(false);
    expect(shouldSimulateProvisionFailure('web-failover')).toBe(false);
  });
});
