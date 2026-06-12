'use client';

import { useState } from 'react';
import { UsageHistoryChart } from '@/components/resources/UsageHistoryChart';
import { VmMetrics } from '@/components/resources/VmMetrics';

type MetricsTab = 'live' | 'usage';

type VmMetricsPanelProps = {
  resourceId: string;
  resourceUrl: string;
  vcpu: number;
  ramGb: number;
  locked?: boolean;
  invoiceId?: string;
};

export function VmMetricsPanel({
  resourceId,
  resourceUrl,
  vcpu,
  ramGb,
  locked,
  invoiceId,
}: VmMetricsPanelProps) {
  const [tab, setTab] = useState<MetricsTab>('live');

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-low p-1">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={`rounded-md px-4 py-2 font-body-sm text-body-sm font-semibold transition-colors ${
            tab === 'live'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => setTab('usage')}
          className={`rounded-md px-4 py-2 font-body-sm text-body-sm font-semibold transition-colors ${
            tab === 'usage'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Recent usage
        </button>
      </div>

      {tab === 'live' ? (
        <VmMetrics
          resourceId={resourceId}
          resourceUrl={resourceUrl}
          vcpu={vcpu}
          ramGb={ramGb}
          locked={locked === true}
          {...(invoiceId ? { invoiceId } : {})}
        />
      ) : (
        <UsageHistoryChart
          resourceUrl={resourceUrl}
          locked={locked === true}
          {...(invoiceId ? { invoiceId } : {})}
        />
      )}
    </div>
  );
}
