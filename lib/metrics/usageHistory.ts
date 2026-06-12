import { generateMockTelemetry } from '@/lib/metrics/mockTelemetry';

export type UsageBucket = {
  bucketStart: string;
  cpuAvgPct: number;
  memAvgGb: number;
  networkOutMb: number;
};

export const USAGE_MAX_DAYS = 7;
export const USAGE_HOURS_7D = USAGE_MAX_DAYS * 24;

function hourBoundaryUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function networkOutMb(resourceId: string, bucketStart: Date): number {
  let hash = 0;
  const key = `${resourceId}:${bucketStart.getTime()}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return Math.round((hash % 4500) + 120);
}

export function generateUsageBucket(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  bucketStart: Date,
): UsageBucket {
  const tick = Math.floor(bucketStart.getTime() / 3_600_000);
  const sample = generateMockTelemetry(resourceId, vcpu, ramGb, tick);

  return {
    bucketStart: bucketStart.toISOString(),
    cpuAvgPct: sample.cpuPct,
    memAvgGb: sample.memUsedGb,
    networkOutMb: networkOutMb(resourceId, bucketStart),
  };
}

/** Hourly buckets from provisionedAt through now, capped at USAGE_MAX_DAYS. */
export function generateUsageSinceProvisioned(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  provisionedAt: Date,
  now = new Date(),
): UsageBucket[] {
  const end = hourBoundaryUtc(now);
  const start = hourBoundaryUtc(provisionedAt);
  const maxStart = new Date(end.getTime() - USAGE_HOURS_7D * 3_600_000);
  const effectiveStart = start > maxStart ? start : maxStart;

  if (effectiveStart > end) {
    return [];
  }

  const buckets: UsageBucket[] = [];
  for (let cursor = effectiveStart.getTime(); cursor <= end.getTime(); cursor += 3_600_000) {
    buckets.push(generateUsageBucket(resourceId, vcpu, ramGb, new Date(cursor)));
  }

  return buckets.length > USAGE_HOURS_7D ? buckets.slice(-USAGE_HOURS_7D) : buckets;
}

/** @deprecated Prefer generateUsageSinceProvisioned — kept for seed script */
export function generateUsageHistory(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  hours = USAGE_HOURS_7D,
  now = new Date(),
): UsageBucket[] {
  const end = hourBoundaryUtc(now);

  return Array.from({ length: hours }, (_, index) => {
    const bucketStart = new Date(end.getTime() - (hours - 1 - index) * 3_600_000);
    return generateUsageBucket(resourceId, vcpu, ramGb, bucketStart);
  });
}

/** @param days Number of days of hourly buckets (default 7) — seed only */
export function generateUsageBucketsForRange(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  days = USAGE_MAX_DAYS,
  now = new Date(),
): UsageBucket[] {
  return generateUsageHistory(resourceId, vcpu, ramGb, days * 24, now);
}
