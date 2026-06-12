'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DEMO_DECLINE_CARD, DEMO_SUCCESS_CARD } from '@/lib/payment/mockGateway';

type PaymentCheckoutProps = {
  amountBdt: number;
  paying: boolean;
  payError: string;
  onPay: (payload: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
  }) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
  paidReference?: string | null;
  cardLast4?: string | null;
};

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function PaymentCheckout({
  amountBdt,
  paying,
  payError,
  onPay,
  defaultOpen = false,
  embedded = false,
  paidReference,
  cardLast4,
}: PaymentCheckoutProps) {
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  function fillDemoCard() {
    setCardNumber(formatCardNumber(DEMO_SUCCESS_CARD));
    setExpiryMonth('12');
    setExpiryYear('30');
    setCvc('123');
  }

  function fillDeclineDemo() {
    setCardNumber(formatCardNumber(DEMO_DECLINE_CARD));
    setExpiryMonth('12');
    setExpiryYear('30');
    setCvc('123');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onPay({
      cardNumber: cardNumber.replace(/\D/g, ''),
      expiryMonth,
      expiryYear,
      cvc,
    });
  }

  const inputClass =
    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-base text-body-base text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20';
  const inputErrorClass =
    'w-full rounded-lg border border-error bg-error-container/10 px-4 py-2.5 font-body-base text-body-base text-on-surface placeholder:text-outline focus:border-error focus:outline-none focus:ring-4 focus:ring-error/20';

  if (paidReference) {
    return (
      <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-container-padding">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <div>
            <h3 className="font-section-title text-section-title text-emerald-900">Payment complete</h3>
            <p className="mt-1 font-body-sm text-body-sm text-emerald-800">
              Reference <span className="font-code-inline">{paidReference}</span>
              {cardLast4 ? ` · Visa ****${cardLast4}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!open && !embedded) {
    return (
      <div className="flex flex-col items-stretch gap-2">
        <Button type="button" onClick={() => setOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
          Pay ৳{amountBdt.toLocaleString()} now
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-xl border border-outline-variant bg-surface-container-low p-container-padding ${
        embedded ? 'sticky top-24' : 'max-w-md'
      }`}
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <span className="material-symbols-outlined text-2xl text-primary">credit_card</span>
        </div>
        <p className="font-display-title text-[28px] font-extrabold leading-none text-on-surface">
          ৳{amountBdt.toLocaleString()}
        </p>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Secure demo checkout</p>
      </div>

      {!embedded && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-section-title text-section-title text-on-surface">Payment method</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="material-symbols-outlined rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Close payment form"
          >
            close
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={fillDemoCard}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-3 py-1.5 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Demo success card
        </button>
        <button
          type="button"
          onClick={fillDeclineDemo}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-3 py-1.5 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:border-tertiary hover:text-tertiary"
        >
          <span className="material-symbols-outlined text-[16px]">cancel</span>
          Test decline
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
            Card number
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className={payError ? inputErrorClass : inputClass}
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline">
              credit_card
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              Expiry
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                required
                maxLength={2}
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                className={payError ? inputErrorClass : inputClass}
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                required
                maxLength={2}
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="YY"
                className={payError ? inputErrorClass : inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              CVC
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              required
              maxLength={4}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              className={payError ? inputErrorClass : inputClass}
            />
          </div>
        </div>

        {payError && (
          <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container p-3">
            <span className="material-symbols-outlined text-[18px] text-error">error</span>
            <p className="font-body-sm text-body-sm text-on-error-container">{payError}</p>
          </div>
        )}

        <Button type="submit" loading={paying} className="w-full shadow-lg shadow-primary/20" size="lg">
          {paying ? 'Processing payment…' : `Pay ৳${amountBdt.toLocaleString()} now`}
        </Button>
      </form>

      <p className="mt-3 flex items-center justify-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">lock</span>
        Simulated gateway — no real charge
      </p>
    </div>
  );
}
