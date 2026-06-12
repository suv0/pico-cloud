export const SLA_TARGET_PCT = 99.99;

export type IncidentForSla = {
  startedAt: Date;
  resolvedAt: Date | null;
  severity: string;
};

export type SlaMetrics = {
  targetPct: number;
  currentMonthPct: number;
  mttrMinutes: number;
};

export function computeSlaMetrics(
  incidents: IncidentForSla[],
  now = new Date(),
): SlaMetrics {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const elapsedMinutes = Math.max(1, (now.getTime() - monthStart.getTime()) / 60_000);

  let downtimeMinutes = 0;
  let resolvedMajor = 0;
  let totalMttrMinutes = 0;

  for (const incident of incidents) {
    if (incident.severity !== 'MAJOR') continue;

    const end = incident.resolvedAt ?? now;
    const effectiveStart = incident.startedAt < monthStart ? monthStart : incident.startedAt;
    if (end <= monthStart) continue;

    downtimeMinutes += (end.getTime() - effectiveStart.getTime()) / 60_000;

    if (incident.resolvedAt) {
      resolvedMajor += 1;
      totalMttrMinutes += (incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 60_000;
    }
  }

  const uptimeRatio = Math.max(0, (elapsedMinutes - downtimeMinutes) / elapsedMinutes);
  const currentMonthPct = Math.round(uptimeRatio * 10_000) / 100;

  return {
    targetPct: SLA_TARGET_PCT,
    currentMonthPct,
    mttrMinutes: resolvedMajor > 0 ? Math.round(totalMttrMinutes / resolvedMajor) : 0,
  };
}

/** @deprecated Use computeSlaMetrics — kept for status route/page imports */
export function computeSlaSummary(
  incidents: Array<{ startedAt: Date; resolvedAt: Date | null; severity?: string }>,
  now = new Date(),
): SlaMetrics {
  return computeSlaMetrics(
    incidents.map((incident) => ({
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      severity: incident.severity ?? 'MAJOR',
    })),
    now,
  );
}
