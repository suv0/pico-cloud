import { z } from 'zod';
import { firstZodError } from '@/lib/validation/zodError';

const paymentBodySchema = z.object({
  cardNumber: z.string().min(1, 'Card number is required'),
  expiryMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Invalid expiry month'),
  expiryYear: z.string().regex(/^(\d{2}|\d{4})$/, 'Invalid expiry year'),
  cvc: z.string().min(3, 'CVC is required').max(4),
});

export type PaymentBody = z.infer<typeof paymentBodySchema>;

export function parsePaymentBody(body: unknown):
  | { ok: true; data: PaymentBody }
  | { ok: false; error: string } {
  const result = paymentBodySchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: firstZodError(result.error) };
  }
  return { ok: true, data: result.data };
}
