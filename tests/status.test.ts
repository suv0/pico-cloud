import { describe, expect, it } from 'vitest';
import { computeSlaMetrics, computeSlaSummary, SLA_TARGET_PCT } from '@/lib/status/sla';

describe('computeSlaMetrics', () => {
  const monthStart = new Date('2026-06-01T00:00:00.000Z');
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('returns target SLA of 99.99%', () => {
    const result = computeSlaMetrics([], now);
    expect(result.targetPct).toBe(SLA_TARGET_PCT);
    expect(result.currentMonthPct).toBe(100);
    expect(result.mttrMinutes).toBe(0);
  });

  it('reduces uptime for major incidents in the current month', () => {
    const result = computeSlaMetrics(
      [
        {
          severity: 'MAJOR',
          startedAt: new Date('2026-06-05T10:00:00.000Z'),
          resolvedAt: new Date('2026-06-05T11:00:00.000Z'),
        },
      ],
      now,
    );

    expect(result.currentMonthPct).toBeLessThan(100);
    expect(result.mttrMinutes).toBe(60);
  });

  it('ignores minor incidents for uptime calculation', () => {
    const withMinor = computeSlaMetrics(
      [
        {
          severity: 'MINOR',
          startedAt: new Date('2026-06-09T08:00:00.000Z'),
          resolvedAt: null,
        },
      ],
      now,
    );
    const baseline = computeSlaMetrics([], now);
    expect(withMinor.currentMonthPct).toBe(baseline.currentMonthPct);
  });

  it('computeSlaSummary defaults missing severity to MAJOR', () => {
    const result = computeSlaSummary(
      [
        {
          startedAt: new Date('2026-06-05T10:00:00.000Z'),
          resolvedAt: new Date('2026-06-05T11:00:00.000Z'),
        },
      ],
      now,
    );
    expect(result.mttrMinutes).toBe(60);
    expect(result.currentMonthPct).toBeLessThan(100);
  });
});
