type Incident = {
  id: string;
  title: string;
  status: string;
  severity: string;
  componentSlug: string | null;
  impactSummary: string;
  startedAt: string;
  resolvedAt: string | null;
};

type IncidentStatus = 'INVESTIGATING' | 'MONITORING' | 'RESOLVED';
type IncidentSeverity = 'MINOR' | 'MAJOR';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  INVESTIGATING: 'Investigating',
  MONITORING: 'Monitoring',
  RESOLVED: 'Resolved',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  INVESTIGATING: 'bg-red-50 text-red-700 border-red-100',
  MONITORING: 'bg-amber-50 text-amber-800 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  MINOR: 'text-on-surface-variant',
  MAJOR: 'text-red-600 font-semibold',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function incidentStatusLabel(status: string): string {
  if (status === 'INVESTIGATING' || status === 'MONITORING' || status === 'RESOLVED') {
    return STATUS_LABELS[status];
  }
  return status;
}

function incidentStatusStyle(status: string): string {
  if (status === 'INVESTIGATING' || status === 'MONITORING' || status === 'RESOLVED') {
    return STATUS_STYLES[status];
  }
  return STATUS_STYLES.INVESTIGATING;
}

function severityStyle(severity: string): string {
  if (severity === 'MINOR' || severity === 'MAJOR') {
    return SEVERITY_STYLES[severity];
  }
  return SEVERITY_STYLES.MINOR;
}

export function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No incidents in the last 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <article
          key={incident.id}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-section-title text-section-title text-on-surface">{incident.title}</h3>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 font-body-sm text-body-sm font-semibold ${incidentStatusStyle(incident.status)}`}
            >
              {incidentStatusLabel(incident.status)}
            </span>
            <span className={`font-body-sm text-body-sm uppercase ${severityStyle(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">{incident.impactSummary}</p>
          <div className="flex flex-wrap gap-4 font-body-sm text-body-sm text-on-surface-variant">
            <span>Started {formatTime(incident.startedAt)}</span>
            {incident.resolvedAt && <span>Resolved {formatTime(incident.resolvedAt)}</span>}
            {incident.componentSlug && <span>Component: {incident.componentSlug}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
