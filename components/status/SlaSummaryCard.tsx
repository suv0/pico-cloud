type SlaSummary = {
  targetPct: number;
  currentMonthPct: number;
  mttrMinutes: number;
};

export function SlaSummaryCard({ sla }: { sla: SlaSummary }) {
  const meetsTarget = sla.currentMonthPct >= sla.targetPct;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding">
      <h2 className="mb-4 font-section-title text-section-title text-on-surface">SLA summary</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Target</p>
          <p className="mt-1 text-2xl font-semibold text-on-surface">{sla.targetPct}%</p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">This month</p>
          <p
            className={`mt-1 text-2xl font-semibold ${meetsTarget ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {sla.currentMonthPct}%
          </p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">MTTR</p>
          <p className="mt-1 text-2xl font-semibold text-on-surface">
            {sla.mttrMinutes > 0 ? `${sla.mttrMinutes} min` : '—'}
          </p>
        </div>
      </div>
      <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
        Uptime computed from incident windows this calendar month. Production would integrate Prometheus
        SLOs and PagerDuty MTTR.
      </p>
    </div>
  );
}
