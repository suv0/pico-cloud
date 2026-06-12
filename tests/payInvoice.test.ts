import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as payInvoice } from '@/app/api/invoices/[id]/pay/route';
import { DEMO_DECLINE_CARD, DEMO_SUCCESS_CARD } from '@/lib/payment/mockGateway';

vi.mock('@/lib/db', () => ({
  db: {
    invoice: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/apiSession', () => ({
  getApiSession: vi.fn(),
}));

vi.mock('@/lib/audit/logger', () => ({
  logEvent: vi.fn(),
}));

vi.mock('@/lib/payment/mockGateway', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/payment/mockGateway')>();
  return {
    ...actual,
    processMockPayment: vi.fn(),
  };
});

import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { processMockPayment } from '@/lib/payment/mockGateway';

const mockedFindUnique = vi.mocked(db.invoice.findUnique);
const mockedUpdateMany = vi.mocked(db.invoice.updateMany);
const mockedGetApiSession = vi.mocked(getApiSession);
const mockedProcessPayment = vi.mocked(processMockPayment);

const unpaidInvoice = {
  id: 'inv-1',
  userId: 'user-1',
  status: 'UNPAID',
  amountBdt: 4500,
  resource: { id: 'res-1', name: 'demo-vm' },
};

const paidInvoice = {
  ...unpaidInvoice,
  status: 'PAID',
  paidAt: new Date(),
  paymentReference: 'PICO-PAY-EXISTING',
  cardLast4: '4242',
};

const paymentBody = {
  cardNumber: DEMO_SUCCESS_CARD,
  expiryMonth: '12',
  expiryYear: '30',
  cvc: '123',
};

function makePayRequest(body: unknown) {
  return new NextRequest('http://localhost/api/invoices/inv-1/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/invoices/[id]/pay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiSession.mockResolvedValue({ userId: 'user-1', role: 'CUSTOMER' } as never);
  });

  it('returns existing invoice when already paid', async () => {
    mockedFindUnique.mockResolvedValue(paidInvoice as never);

    const res = await payInvoice(makePayRequest(paymentBody), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(res.status).toBe(200);
    expect(mockedProcessPayment).not.toHaveBeenCalled();
  });

  it('returns 402 when card is declined', async () => {
    mockedFindUnique.mockResolvedValue(unpaidInvoice as never);
    mockedProcessPayment.mockResolvedValue({
      ok: false,
      code: 'card_declined',
      message: 'Your card was declined.',
    });

    const res = await payInvoice(
      makePayRequest({ ...paymentBody, cardNumber: DEMO_DECLINE_CARD }),
      { params: Promise.resolve({ id: 'inv-1' }) },
    );

    expect(res.status).toBe(402);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('marks invoice paid on success', async () => {
    mockedFindUnique
      .mockResolvedValueOnce(unpaidInvoice as never)
      .mockResolvedValueOnce({
        ...paidInvoice,
        status: 'PAID',
        paymentReference: 'PICO-PAY-NEW',
        cardLast4: '4242',
      } as never);
    mockedProcessPayment.mockResolvedValue({
      ok: true,
      reference: 'PICO-PAY-NEW',
      last4: '4242',
      brand: 'visa',
    });
    mockedUpdateMany.mockResolvedValue({ count: 1 });

    const res = await payInvoice(makePayRequest(paymentBody), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(res.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { id: 'inv-1', status: 'UNPAID' },
      data: expect.objectContaining({
        status: 'PAID',
        paymentReference: 'PICO-PAY-NEW',
        cardLast4: '4242',
      }),
    });
  });

  it('returns paid invoice when concurrent pay already claimed it', async () => {
    mockedFindUnique
      .mockResolvedValueOnce(unpaidInvoice as never)
      .mockResolvedValueOnce(paidInvoice as never);
    mockedProcessPayment.mockResolvedValue({
      ok: true,
      reference: 'PICO-PAY-LATE',
      last4: '4242',
      brand: 'visa',
    });
    mockedUpdateMany.mockResolvedValue({ count: 0 });

    const res = await payInvoice(makePayRequest(paymentBody), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('PAID');
    expect(body.paymentReference).toBe('PICO-PAY-EXISTING');
  });

  it('returns 404 when paying another user invoice (tenant isolation)', async () => {
    mockedFindUnique.mockResolvedValue({
      ...unpaidInvoice,
      userId: 'other-user',
    } as never);

    const res = await payInvoice(makePayRequest(paymentBody), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(res.status).toBe(404);
    expect(mockedProcessPayment).not.toHaveBeenCalled();
  });
});
