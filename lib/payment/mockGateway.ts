export type PaymentInput = {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  amountBdt: number;
  invoiceId: string;
};

export type PaymentSuccess = {
  ok: true;
  reference: string;
  last4: string;
  brand: 'visa' | 'mastercard';
};

export type PaymentFailure = {
  ok: false;
  code: 'card_declined' | 'invalid_card' | 'expired_card' | 'invalid_cvc';
  message: string;
};

export type PaymentResult = PaymentSuccess | PaymentFailure;

/** Stripe-style test cards for demo (no real charges). */
export const DEMO_SUCCESS_CARD = '4242424242424242';
export const DEMO_DECLINE_CARD = '4000000000000002';

function delay(): Promise<void> {
  const ms = 1200 + Math.random() * 800;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isExpired(month: number, year: number): boolean {
  if (month < 1 || month > 12) return true;
  const fullYear = year < 100 ? 2000 + year : year;
  const now = new Date();
  const expiry = new Date(fullYear, month, 0, 23, 59, 59);
  return expiry < now;
}

function makeReference(invoiceId: string): string {
  const suffix = invoiceId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const token = Date.now().toString(36).toUpperCase().slice(-4);
  return `PICO-PAY-${suffix}-${token}`;
}

/**
 * Simulates a card payment gateway (SSLCommerz / Stripe-shaped).
 * Validates test cards, simulates network latency, returns a payment reference.
 */
export async function processMockPayment(input: PaymentInput): Promise<PaymentResult> {
  await delay();

  const digits = normalizeDigits(input.cardNumber);
  const month = parseInt(input.expiryMonth, 10);
  const year = parseInt(input.expiryYear, 10);
  const cvc = normalizeDigits(input.cvc);

  if (digits.length < 13 || digits.length > 19) {
    return {
      ok: false,
      code: 'invalid_card',
      message: 'Enter a valid card number.',
    };
  }

  if (cvc.length < 3 || cvc.length > 4) {
    return {
      ok: false,
      code: 'invalid_cvc',
      message: 'Enter a valid security code (CVC).',
    };
  }

  if (isExpired(month, year)) {
    return {
      ok: false,
      code: 'expired_card',
      message: 'This card has expired. Use a future expiry date.',
    };
  }

  if (digits === DEMO_DECLINE_CARD) {
    return {
      ok: false,
      code: 'card_declined',
      message: 'Your card was declined. Try another payment method.',
    };
  }

  if (digits !== DEMO_SUCCESS_CARD) {
    return {
      ok: false,
      code: 'invalid_card',
      message: 'Demo gateway accepts 4242 4242 4242 4242 (success) or 4000 0000 0000 0002 (decline).',
    };
  }

  return {
    ok: true,
    reference: makeReference(input.invoiceId),
    last4: digits.slice(-4),
    brand: 'visa',
  };
}
