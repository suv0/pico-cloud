import { describe, expect, it } from 'vitest';
import { isPaymentGatedForViewer, isPaymentRequired } from '@/lib/billing/isPaymentRequired';

describe('isPaymentRequired', () => {
  it('returns true for ACTIVE VM with UNPAID invoice', () => {
    expect(
      isPaymentRequired({ status: 'ACTIVE', invoice: { status: 'UNPAID' } }),
    ).toBe(true);
  });

  it('returns false when invoice is PAID', () => {
    expect(
      isPaymentRequired({ status: 'ACTIVE', invoice: { status: 'PAID' } }),
    ).toBe(false);
  });

  it('returns false when VM is not ACTIVE or SUSPENDED', () => {
    expect(
      isPaymentRequired({ status: 'PROVISIONING', invoice: { status: 'UNPAID' } }),
    ).toBe(false);
  });

  it('returns true when ACTIVE with no invoice (billing integrity)', () => {
    expect(isPaymentRequired({ status: 'ACTIVE', invoice: null })).toBe(true);
  });

  it('returns true for SUSPENDED VM with UNPAID invoice', () => {
    expect(
      isPaymentRequired({ status: 'SUSPENDED', invoice: { status: 'UNPAID' } }),
    ).toBe(true);
  });

  it('returns false for SUSPENDED VM with PAID invoice', () => {
    expect(
      isPaymentRequired({ status: 'SUSPENDED', invoice: { status: 'PAID' } }),
    ).toBe(false);
  });

  it('returns false for TERMINATED VM', () => {
    expect(
      isPaymentRequired({ status: 'TERMINATED', invoice: { status: 'UNPAID' } }),
    ).toBe(false);
  });
});

describe('isPaymentGatedForViewer', () => {
  const unpaidActive = { status: 'ACTIVE', invoice: { status: 'UNPAID' } };

  it('applies payment gating for customer viewers', () => {
    expect(isPaymentGatedForViewer('customer', unpaidActive)).toBe(true);
  });

  it('does not apply payment gating for admin viewers (D-018)', () => {
    expect(isPaymentGatedForViewer('admin', unpaidActive)).toBe(false);
  });

  it('still detects unpaid invoice for admin billing notice', () => {
    expect(isPaymentRequired(unpaidActive)).toBe(true);
    expect(isPaymentGatedForViewer('admin', unpaidActive)).toBe(false);
  });
});
