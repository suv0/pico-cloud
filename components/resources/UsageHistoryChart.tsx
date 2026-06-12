'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type UsageBucket = {
  bucketStart: string;
  cpuAvgPct: number;
  memAvgGb: number;
  networkOutMb: number;
};

type UsageResponse = {
  buckets: UsageBucket[];
  state: 'accumulating' | 'ready';
  provisionedAt: string | null;
  mockSample?: boolean;
};

type UsageHistoryChartProps = {
  resourceUrl: string;
  locked?: boolean;
  invoiceId?: string;
};

export function UsageHistoryChart({ resourceUrl, locked, invoiceId }: UsageHistoryChartProps) {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!locked);

  useEffect(() => {
    if (locked) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${resourceUrl}/usage`);
        if (res.status === 402) {
          if (!cancelled) setError('Payment required');
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError('Unable to load usage');
          return;
        }
        const body = await res.json() as UsageResponse;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError('Unable to load usage');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [resourceUrl, locked]);

  const buckets = useMemo(() => data?.buckets ?? [], [data?.buckets]);

  const cpuBars = useMemo(() => {
    if (buckets.length === 0) return [];
    const step = Math.max(1, Math.floor(buckets.length / 12));
    const sampled = buckets.filter((_, index) => index % step === 0 || index === buckets.length - 1);
    const maxCpu = Math.max(...sampled.map((b) => b.cpuAvgPct), 1);
    return sampled.map((bucket) => ({
      key: bucket.bucketStart,
      label: new Date(bucket.bucketStart).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      heightPct: Math.round((bucket.cpuAvgPct / maxCpu) * 100),
      cpuAvgPct: bucket.cpuAvgPct,
    }));
  }, [buckets]);

  const networkTotalMb = useMemo(
    () => Math.round(buckets.reduce((sum, bucket) => sum + bucket.networkOutMb, 0)),
    [buckets],
  );

  const avgCpu = useMemo(() => {
    if (buckets.length === 0) return 0;
    const total = buckets.reduce((sum, bucket) => sum + bucket.cpuAvgPct, 0);
    return Math.round((total / buckets.length) * 10) / 10;
  }, [buckets]);

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="h-48 rounded-lg bg-surface-container opacity-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-lowest/80 p-6 text-center backdrop-blur-[2px]">
          <span className="material-symbols-outlined mb-2 text-4xl text-amber-600">lock</span>
          <h3 className="font-section-title text-section-title text-on-surface">Recent usage locked</h3>
          <p className="mt-1 max-w-sm font-body-sm text-body-sm text-on-surface-variant">
            Pay invoice to view usage since this VM was provisioned.
          </p>
          {invoiceId && (
            <Link
              href={`/billing/${invoiceId}?pay=1`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-body-base font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Pay now
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="font-body-sm text-body-sm text-on-surface-variant">Loading usage…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="font-body-sm text-body-sm text-on-error">{error}</p>
      </div>
    );
  }

  if (data?.state === 'accumulating') {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding text-center">
        <span className="material-symbols-outlined mb-2 text-4xl text-on-surface-variant">schedule</span>
        <h3 className="font-section-title text-section-title text-on-surface">Usage not available yet</h3>
        <p className="mx-auto mt-2 max-w-md font-body-sm text-body-sm text-on-surface-variant">
          Hourly CPU and network totals appear once this VM finishes provisioning and becomes active.
        </p>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="font-body-sm text-body-sm text-on-surface-variant">No usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-element-gap">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            CPU — recent usage
          </h3>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {data?.mockSample
              ? `${buckets.length} hourly buckets (demo sample)`
              : `${buckets.length} hourly bucket${buckets.length === 1 ? '' : 's'} since provision`}
          </span>
        </div>
        <div className="flex h-32 items-end gap-1 px-2">
          {cpuBars.map((bar) => (
            <div
              key={bar.key}
              className="flex-1 rounded-t bg-primary transition-all duration-300"
              style={{
                height: `${Math.max(bar.heightPct, 8)}%`,
                opacity: 0.35 + bar.heightPct / 140,
              }}
              title={`${bar.label}: ${bar.cpuAvgPct.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <span className="font-body-sm text-body-sm font-semibold">{avgCpu}% avg CPU</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Demo telemetry</span>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <h3 className="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
          Network egress
        </h3>
        <p className="text-2xl font-semibold text-on-surface">
          {networkTotalMb.toLocaleString()} MB
        </p>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
          {data?.mockSample
            ? 'Mock sample for demo — not used for billing. Older VMs use buckets since provision.'
            : 'Mock totals since provision — not used for billing in this demo.'}
        </p>
      </div>
    </div>
  );
}
