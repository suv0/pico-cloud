export type MockTelemetrySample = {
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
  sampledAt: string;
  barHeights: number[];
};

function hashSeed(resourceId: string): number {
  let hash = 0;
  for (let i = 0; i < resourceId.length; i++) {
    hash = (hash * 31 + resourceId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function generateMockTelemetry(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  tick = 0,
): MockTelemetrySample {
  const rand = mulberry32(hashSeed(resourceId) + tick * 97);
  const baselineCpu = clamp(8 + vcpu * 3 + tick * 0.4, 5, 85);
  const walk = (rand() - 0.5) * 12;
  const cpuPct = clamp(Math.round((baselineCpu + walk) * 10) / 10, 0, 100);

  const memRatio = clamp(0.35 + rand() * 0.35 + tick * 0.002, 0.2, 0.95);
  const memUsedGb = Math.round(ramGb * memRatio * 10) / 10;

  const barHeights = Array.from({ length: 9 }, (_, i) => {
    const barRand = mulberry32(hashSeed(resourceId) + tick * 13 + i * 7);
    const offset = (barRand() - 0.5) * 20;
    return clamp(Math.round(cpuPct + offset - (8 - i) * 2), 5, 100);
  });

  return {
    cpuPct,
    memUsedGb,
    memTotalGb: ramGb,
    sampledAt: new Date().toISOString(),
    barHeights,
  };
}
