import { describe, expect, it } from 'vitest';
import { generateMockTelemetry } from '@/lib/metrics/mockTelemetry';

describe('generateMockTelemetry', () => {
  it('keeps CPU between 0 and 100', () => {
    for (let tick = 0; tick < 20; tick++) {
      const sample = generateMockTelemetry('resource-abc', 4, 8, tick);
      expect(sample.cpuPct).toBeGreaterThanOrEqual(0);
      expect(sample.cpuPct).toBeLessThanOrEqual(100);
    }
  });

  it('keeps memory usage within total RAM', () => {
    for (let tick = 0; tick < 20; tick++) {
      const sample = generateMockTelemetry('resource-xyz', 2, 16, tick);
      expect(sample.memTotalGb).toBe(16);
      expect(sample.memUsedGb).toBeGreaterThanOrEqual(0);
      expect(sample.memUsedGb).toBeLessThanOrEqual(16);
    }
  });

  it('returns stable bar heights for the same tick', () => {
    const first = generateMockTelemetry('same-id', 2, 4, 3);
    const second = generateMockTelemetry('same-id', 2, 4, 3);
    expect(second.barHeights).toEqual(first.barHeights);
    expect(second.cpuPct).toBe(first.cpuPct);
  });
});
