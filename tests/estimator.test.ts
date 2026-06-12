import { describe, it, expect } from 'vitest';
import { calculateCustomPrice } from '@/lib/pricing/estimator';

const UNIT_PRICES = { vcpu: 500, ram_gb: 200, storage_gb: 10 };

describe('calculateCustomPrice', () => {
  it('calculates price for 2 vCPU, 4 GB RAM, 80 GB SSD', () => {
    // 2×500 + 4×200 + 80×10 = 1000 + 800 + 800 = 2600
    expect(calculateCustomPrice({ vcpu: 2, ramGb: 4, storageGb: 80 }, UNIT_PRICES)).toBe(2600);
  });

  it('calculates price for minimum spec (1 vCPU, 2 GB, 40 GB)', () => {
    // 1×500 + 2×200 + 40×10 = 500 + 400 + 400 = 1300
    expect(calculateCustomPrice({ vcpu: 1, ramGb: 2, storageGb: 40 }, UNIT_PRICES)).toBe(1300);
  });

  it('calculates price for maximum spec (16 vCPU, 64 GB, 500 GB)', () => {
    // 16×500 + 64×200 + 500×10 = 8000 + 12800 + 5000 = 25800
    expect(calculateCustomPrice({ vcpu: 16, ramGb: 64, storageGb: 500 }, UNIT_PRICES)).toBe(25800);
  });

  it('returns 0 for all-zero spec (edge case)', () => {
    expect(calculateCustomPrice({ vcpu: 0, ramGb: 0, storageGb: 0 }, UNIT_PRICES)).toBe(0);
  });

  it('uses the provided unit prices — not hardcoded constants', () => {
    const differentPrices = { vcpu: 100, ram_gb: 50, storage_gb: 5 };
    // 1×100 + 1×50 + 1×5 = 155
    expect(calculateCustomPrice({ vcpu: 1, ramGb: 1, storageGb: 1 }, differentPrices)).toBe(155);
  });
});
