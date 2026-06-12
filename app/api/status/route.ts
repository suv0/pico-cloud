import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeSlaSummary } from '@/lib/status/sla';

const INCIDENT_LOOKBACK_DAYS = 30;

export async function GET() {
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

  return NextResponse.json({
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
  });
}
