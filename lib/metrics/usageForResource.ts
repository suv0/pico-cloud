import {
  generateUsageSinceProvisioned,
  generateUsageHistory,
  type UsageBucket,
  USAGE_MAX_DAYS,
} from '@/lib/metrics/usageHistory';

export type UsageState = 'accumulating' | 'ready';

export type UsageResponse = {
  range: string;
  buckets: UsageBucket[];
  state: UsageState;
  provisionedAt: string | null;
  /** True when showing a fixed demo window because the VM is too new for real hourly buckets. */
  mockSample?: boolean;
};

type DbUsageRow = {
  bucketStart: Date;
  cpuAvgPct: number;
  memAvgGb: number;
  networkOutMb: number;
};

type ResourceForUsage = {
  id: string;
  vcpu: number;
  ramGb: number;
  provisionedAt: Date | null;
};

/** Minimum buckets before we backfill with a demo sample (reviewers must see a chart). */
const MIN_BUCKETS_FOR_CHART = 12;
const DEMO_SAMPLE_HOURS = 48;

function mapDbRow(row: DbUsageRow): UsageBucket {
  return {
    bucketStart: row.bucketStart.toISOString(),
    cpuAvgPct: row.cpuAvgPct,
    memAvgGb: row.memAvgGb,
    networkOutMb: row.networkOutMb,
  };
}

export function buildUsageResponse(
  resource: ResourceForUsage,
  dbBuckets: DbUsageRow[],
  now = new Date(),
): UsageResponse {
  const provisionedAt = resource.provisionedAt;

  if (!provisionedAt) {
    return {
      range: 'recent',
      buckets: [],
      state: 'accumulating',
      provisionedAt: null,
    };
  }

  const maxLookback = new Date(now.getTime() - USAGE_MAX_DAYS * 24 * 3_600_000);
  const since = provisionedAt > maxLookback ? provisionedAt : maxLookback;

  const filteredDb = dbBuckets
    .filter((row) => row.bucketStart >= since && row.bucketStart <= now)
    .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime());

  let buckets: UsageBucket[];
  let mockSample = false;

  if (filteredDb.length > 0) {
    buckets = filteredDb.map(mapDbRow);
  } else {
    buckets = generateUsageSinceProvisioned(
      resource.id,
      resource.vcpu,
      resource.ramGb,
      provisionedAt,
      now,
    );

    if (buckets.length < MIN_BUCKETS_FOR_CHART) {
      buckets = generateUsageHistory(
        resource.id,
        resource.vcpu,
        resource.ramGb,
        DEMO_SAMPLE_HOURS,
        now,
      );
      mockSample = true;
    }
  }

  return {
    range: 'recent',
    buckets,
    state: 'ready',
    provisionedAt: provisionedAt.toISOString(),
    mockSample,
  };
}
