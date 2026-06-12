import { describe, expect, it } from 'vitest';
import { PAYMENT_GRACE_DAYS } from '@/lib/billing/constants';

describe('grace config', () => {
  it('is 7 days', () => {
    expect(PAYMENT_GRACE_DAYS).toBe(7);
  });
});
