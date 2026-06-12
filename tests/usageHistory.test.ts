import { describe, expect, it } from 'vitest';
import {
  generateUsageSinceProvisioned,
  generateUsageBucketsForRange,
  USAGE_HOURS_7D,
} from '@/lib/metrics/usageHistory';
import { buildUsageResponse } from '@/lib/metrics/usageForResource';

describe('usageHistory', () => {
  it('generateUsageSinceProvisioned caps at 7 days from provisionedAt', () => {
    const now = new Date('2026-06-10T15:30:00.000Z');
    const provisionedAt = new Date('2026-06-01T10:00:00.000Z');
    const buckets = generateUsageSinceProvisioned('res-test', 2, 4, provisionedAt, now);
    expect(buckets.length).toBeLessThanOrEqual(USAGE_HOURS_7D);
    expect(buckets.length).toBeGreaterThan(100);
  });

  it('generateUsageSinceProvisioned returns fewer buckets for recent VM', () => {
    const now = new Date('2026-06-10T15:30:00.000Z');
    const provisionedAt = new Date('2026-06-09T14:00:00.000Z');
    const buckets = generateUsageSinceProvisioned('res-test', 2, 4, provisionedAt, now);
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.length).toBeLessThan(USAGE_HOURS_7D);
  });

  it('generateUsageBucketsForRange still works for seed (deprecated path)', () => {
    const buckets = generateUsageBucketsForRange('res-test', 2, 4, 7);
    expect(buckets).toHaveLength(USAGE_HOURS_7D);
  });
});

describe('buildUsageResponse', () => {
  it('returns demo sample buckets for VM younger than one hour with no DB rows', () => {
    const now = new Date();
    const provisionedAt = new Date(now.getTime() - 15 * 60_000);
    const result = buildUsageResponse(
      { id: 'res-new', vcpu: 2, ramGb: 4, provisionedAt },
      [],
      now,
    );
    expect(result.state).toBe('ready');
    expect(result.mockSample).toBe(true);
    expect(result.buckets.length).toBe(48);
  });

  it('returns ready with generated buckets for older VM without DB rows', () => {
    const now = new Date();
    const provisionedAt = new Date(now.getTime() - 3 * 24 * 60 * 60_000);
    const result = buildUsageResponse(
      { id: 'res-old', vcpu: 2, ramGb: 4, provisionedAt },
      [],
      now,
    );
    expect(result.state).toBe('ready');
    expect(result.buckets.length).toBeGreaterThan(0);
  });
});
