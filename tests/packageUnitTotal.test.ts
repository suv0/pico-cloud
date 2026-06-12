import { describe, expect, it } from 'vitest';
import { calculatePackageUnitTotal } from '@/lib/pricing/packageUnitTotal';

const UNIT_PRICES = { vcpu: 500, ram_gb: 200, storage_gb: 10 };

describe('calculatePackageUnitTotal', () => {
  it('matches custom price math for Starter spec', () => {
    // 1×500 + 1×200 + 25×10 = 950
    expect(
      calculatePackageUnitTotal({ vcpu: 1, ramGb: 1, storageGb: 25 }, UNIT_PRICES),
    ).toBe(950);
  });

  it('matches custom price math for Standard spec', () => {
    // 2×500 + 4×200 + 80×10 = 2600
    expect(
      calculatePackageUnitTotal({ vcpu: 2, ramGb: 4, storageGb: 80 }, UNIT_PRICES),
    ).toBe(2600);
  });

  it('uses provided unit prices, not hardcoded values', () => {
    const cheap = { vcpu: 100, ram_gb: 50, storage_gb: 5 };
    expect(calculatePackageUnitTotal({ vcpu: 2, ramGb: 4, storageGb: 80 }, cheap)).toBe(800);
  });
});
