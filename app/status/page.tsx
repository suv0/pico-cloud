import Link from 'next/link';
import { IncidentTimeline } from '@/components/status/IncidentTimeline';
import { PlatformStatusGrid } from '@/components/status/PlatformStatusGrid';
import { SlaSummaryCard } from '@/components/status/SlaSummaryCard';
import { db } from '@/lib/db';
import { computeSlaSummary } from '@/lib/status/sla';

export const dynamic = 'force-dynamic';

const INCIDENT_LOOKBACK_DAYS = 30;

async function getStatusData() {
  const lookbackStart = new Date(Date.now() - INCIDENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [components, incidents] = await Promise.all([
    db.platformComponent.findMany({ orderBy: { slug: 'asc' } }),
    db.incident.findMany({
      where: {
        OR: [
          { resolvedAt: null },
          { resolvedAt: { gte: lookbackStart } },
          { startedAt: { gte: lookbackStart } },
        ],
      },
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  const sla = computeSlaSummary(
    incidents.map((incident) => ({
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      severity: incident.severity,
    })),
  );

  return {
    components: components.map((component) => ({
      slug: component.slug,
      name: component.name,
      status: component.status,
      description: component.description,
      updatedAt: component.updatedAt.toISOString(),
    })),
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      severity: incident.severity,
      componentSlug: incident.componentSlug,
      impactSummary: incident.impactSummary,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    })),
    sla,
  };
}

function overallStatus(components: { status: string }[]): string {
  if (components.some((c) => c.status === 'MAJOR_OUTAGE')) return 'Major outage';
  if (components.some((c) => c.status === 'DEGRADED')) return 'Degraded performance';
  return 'All systems operational';
}

export default async function StatusPage() {
  const { components, incidents, sla } = await getStatusData();
  const headline = overallStatus(components);
  const hasOutage = components.some((c) => c.status === 'MAJOR_OUTAGE');
  const hasDegraded = components.some((c) => c.status === 'DEGRADED');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-grid-gutter">
          <Link href="/" prefetch={false} className="font-display-title text-display-title font-bold text-primary">
            PICO Cloud
          </Link>
          <Link
            href="/"
            className="font-body-sm text-body-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
          >
            Back to home
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-grid-gutter py-section-gap">
        <div className="mb-10">
          <p className="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
            Platform status
          </p>
          <h1 className="mb-3 text-3xl font-bold text-on-surface md:text-4xl">{headline}</h1>
          <p className="font-body-base text-body-base text-on-surface-variant">
            Public health dashboard for PICO Cloud services. Updated from seeded platform data.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                hasOutage ? 'bg-red-500' : hasDegraded ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {components.length} components monitored
            </span>
          </div>
        </div>

        <section className="mb-10 space-y-4">
          <h2 className="font-section-title text-section-title text-on-surface">Components</h2>
          <PlatformStatusGrid components={components} />
        </section>

        <section className="mb-10">
          <SlaSummaryCard sla={sla} />
        </section>

        <section className="space-y-4">
          <h2 className="font-section-title text-section-title text-on-surface">Incidents</h2>
          <IncidentTimeline incidents={incidents} />
        </section>
      </main>
    </div>
  );
}
