import { describe, it, expect } from 'vitest';
import {
  DEMO_DECLINE_CARD,
  DEMO_SUCCESS_CARD,
  processMockPayment,
} from '@/lib/payment/mockGateway';

const BASE = {
  expiryMonth: '12',
  expiryYear: '30',
  cvc: '123',
  amountBdt: 4500,
  invoiceId: 'inv_test_001',
};

describe('processMockPayment', () => {
  it('succeeds for the demo success card', async () => {
    const result = await processMockPayment({
      ...BASE,
      cardNumber: DEMO_SUCCESS_CARD,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reference).toMatch(/^PICO-PAY-/);
      expect(result.last4).toBe('4242');
      expect(result.brand).toBe('visa');
    }
  }, 10000);

  it('declines the demo decline card', async () => {
    const result = await processMockPayment({
      ...BASE,
      cardNumber: DEMO_DECLINE_CARD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('card_declined');
    }
  }, 10000);

  it('rejects unknown card numbers', async () => {
    const result = await processMockPayment({
      ...BASE,
      cardNumber: '5555555555554444',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_card');
    }
  }, 10000);

  it('rejects expired cards', async () => {
    const result = await processMockPayment({
      ...BASE,
      cardNumber: DEMO_SUCCESS_CARD,
      expiryMonth: '01',
      expiryYear: '20',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('expired_card');
    }
  }, 10000);
});
