'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MockTelemetrySample } from '@/lib/metrics/mockTelemetry';

type VmMetricsProps = {
  resourceId: string;
  resourceUrl: string;
  ramGb: number;
  vcpu: number;
  locked?: boolean;
  invoiceId?: string;
};

export function VmMetrics({ resourceId, resourceUrl, ramGb, vcpu, locked, invoiceId }: VmMetricsProps) {
  const [sample, setSample] = useState<MockTelemetrySample | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (locked) return;

    let cancelled = false;
    const metricsUrl = `${resourceUrl}/metrics`;
    const streamUrl = `${resourceUrl}/metrics/stream`;

    async function fetchSnapshot() {
      try {
        const res = await fetch(metricsUrl);
        if (!res.ok) return;
        const data = await res.json() as MockTelemetrySample;
        if (!cancelled) setSample(data);
      } catch {
        if (!cancelled) setError('Unable to load metrics');
      }
    }

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);
      eventSource.onopen = () => {
        if (!cancelled) {
          setLive(true);
          setError('');
        }
      };
      eventSource.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data) as MockTelemetrySample;
          setSample(data);
          setLive(true);
          setError('');
        } catch {
          setError('Invalid metrics payload');
        }
      };
      eventSource.onerror = () => {
        if (cancelled) return;
        setLive(false);
        eventSource?.close();
        void fetchSnapshot();
      };
    } catch {
      void fetchSnapshot();
    }

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [resourceId, resourceUrl, locked]);

  const cpuPct = sample?.cpuPct ?? Math.min(95, 8 + vcpu * 3 + ramGb);
  const memUsedGb = sample?.memUsedGb ?? Math.round(ramGb * 0.52 * 10) / 10;
  const memTotalGb = sample?.memTotalGb ?? ramGb;
  const barHeights = sample?.barHeights ?? [20, 35, 25, 45, 60, 40, 75, 65, cpuPct];

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 gap-element-gap p-container-padding opacity-40 md:grid-cols-2">
          <div className="h-48 rounded-lg bg-surface-container" />
          <div className="h-48 rounded-lg bg-surface-container" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-lowest/80 p-6 text-center backdrop-blur-[2px]">
          <span className="material-symbols-outlined mb-2 text-4xl text-amber-600">lock</span>
          <h3 className="font-section-title text-section-title text-on-surface">Live metrics locked</h3>
          <p className="mt-1 max-w-sm font-body-sm text-body-sm text-on-surface-variant">
            Pay invoice to view live metrics and monitoring.
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

  return (
    <div className="grid grid-cols-1 gap-element-gap md:grid-cols-2">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            CPU Utilization
          </h3>
          <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {live && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            {live ? 'Live' : 'Snapshot'}
          </span>
        </div>
        <div className="flex h-32 items-end gap-1 px-2">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary transition-all duration-500"
              style={{ height: `${h}%`, opacity: 0.2 + (i / barHeights.length) * 0.8 }}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <span className="font-body-sm text-body-sm font-semibold">{cpuPct.toFixed(1)}%</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Updates every ~2s</span>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <div>
          <h3 className="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
            Memory Usage
          </h3>
          <div className="text-2xl font-semibold text-on-surface">
            {memUsedGb} GB{' '}
            <span className="text-body-sm font-normal text-on-surface-variant">/ {memTotalGb} GB</span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(memUsedGb / memTotalGb) * 100}%` }}
          />
        </div>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
          {error || 'Mock telemetry — demo only'}
        </p>
      </div>
    </div>
  );
}
