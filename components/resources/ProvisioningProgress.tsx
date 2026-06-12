import Link from 'next/link';
import type { ProvisionProgressView } from '@/lib/provisioning/progressFromAudit';

type ProvisioningProgressProps = {
  progress: ProvisionProgressView;
  paymentRequired?: boolean;
  monthlyPriceBdt?: number;
  invoiceId?: string;
};

function segmentClass(state: ProvisionProgressView['steps'][number]['state']): string {
  if (state === 'completed') return 'bg-primary';
  if (state === 'current') return 'segment-pulse';
  if (state === 'failed') return 'bg-error';
  return 'bg-surface-container';
}

function StepIcon({ state }: { state: ProvisionProgressView['steps'][number]['state'] }) {
  if (state === 'completed') {
    return <span className="material-symbols-outlined text-emerald-600 shrink-0">check_circle</span>;
  }
  if (state === 'current') {
    return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />;
  }
  if (state === 'failed') {
    return <span className="material-symbols-outlined text-error shrink-0">cancel</span>;
  }
  return <span className="material-symbols-outlined text-outline-variant opacity-40 shrink-0">radio_button_unchecked</span>;
}

function stepTextClass(state: ProvisionProgressView['steps'][number]['state']): string {
  if (state === 'current') return 'text-primary font-medium';
  if (state === 'completed') return 'text-on-surface-variant';
  if (state === 'failed') return 'text-error';
  return 'text-on-surface-variant opacity-40';
}

function cardTitle(phase: ProvisionProgressView['phase']): string {
  if (phase === 'terminated') return 'Instance Cancelled';
  if (phase === 'success') return 'Instance Health & Provisioning';
  return 'Provisioning status';
}

function cardSubtitle(phase: ProvisionProgressView['phase']): string {
  if (phase === 'terminated') return 'This VM has been permanently cancelled.';
  if (phase === 'success') return 'Continuous status monitoring and deployment cycle.';
  return 'Est. time remaining: ~45s per step';
}

export function ProvisioningProgress({
  progress,
  paymentRequired,
  monthlyPriceBdt,
  invoiceId,
}: ProvisioningProgressProps) {
  const { phase, headline, steps, failureReason, publicIp, completedCount, totalSteps } = progress;
  const successHeadline = paymentRequired
    ? 'VM is running — complete payment to unlock full access'
    : headline;

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant px-container-padding py-ui-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-section-title text-section-title text-on-surface">{cardTitle(phase)}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{cardSubtitle(phase)}</p>
          </div>
          {phase === 'in_progress' && (
            <span className="font-code-inline text-code-inline text-on-surface-variant">
              Step {completedCount + 1} of {totalSteps}
            </span>
          )}
        </div>
      </div>

      <div className="p-container-padding">
        {/* Progress bar segments */}
        <div className="mb-6 flex gap-1">
          {steps.map((step) => (
            <div
              key={step.key}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${segmentClass(step.state)}`}
              title={step.label}
            />
          ))}
        </div>

        {/* Phase card */}
        {phase === 'terminated' ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex items-center gap-4 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-outline-variant/30">
              <span className="material-symbols-outlined text-on-surface-variant">cancel</span>
            </div>
            <div className="min-h-[2.5rem] flex flex-col justify-center">
              <p className="font-body-base text-body-base font-semibold text-on-surface-variant">{headline}</p>
            </div>
          </div>
        ) : phase === 'success' ? (
          <div
            className={`mb-6 flex items-start gap-4 rounded-lg border p-6 ${
              paymentRequired
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-100 bg-emerald-50'
            }`}
          >
            <div
              className={`rounded-full p-2 text-white ${
                paymentRequired ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            >
              <span className="material-symbols-outlined">
                {paymentRequired ? 'lock' : 'check_circle'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className={`font-section-title text-section-title ${
                      paymentRequired ? 'text-amber-900' : 'text-emerald-900'
                    }`}
                  >
                    {successHeadline}
                  </h3>
                  {paymentRequired && monthlyPriceBdt !== undefined && invoiceId && (
                    <p className="mt-2 font-body-sm text-body-sm text-amber-800">
                      Invoice ৳{monthlyPriceBdt.toLocaleString()} is unpaid —{' '}
                      <Link href={`/billing/${invoiceId}?pay=1`} className="font-semibold text-primary hover:underline">
                        pay now
                      </Link>{' '}
                      to unlock console and live metrics.
                    </p>
                  )}
                </div>
                {publicIp && (
                  <div
                    className={`ml-4 rounded border bg-white px-3 py-1.5 shadow-sm ${
                      paymentRequired ? 'border-amber-200' : 'border-emerald-200'
                    }`}
                  >
                    <span
                      className={`mb-0.5 block font-label-caps text-label-caps ${
                        paymentRequired ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      PUBLIC IP
                    </span>
                    <span className="font-code-inline text-code-inline text-on-surface">{publicIp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : phase === 'failed' ? (
          <div className="bg-error-container border border-error/20 text-on-error-container rounded-lg p-4 flex items-center gap-4 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <span className="material-symbols-outlined">cancel</span>
            </div>
            <div className="min-h-[2.5rem] flex flex-col justify-center">
              <p className="font-body-base text-body-base font-semibold">{headline}</p>
              {failureReason && (
                <p className="mt-0.5 truncate font-body-sm text-body-sm opacity-90" title={failureReason}>
                  {failureReason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-primary-container text-on-primary-container rounded-lg p-4 flex items-center gap-4 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <span className="material-symbols-outlined animate-pulse">memory</span>
            </div>
            <div className="min-h-[2.5rem] flex flex-col justify-center">
              <p className="font-body-base text-body-base font-semibold">{headline}</p>
            </div>
          </div>
        )}

        {/* Steps grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div key={step.key} className={`flex items-center gap-3 ${stepTextClass(step.state)}`}>
              <StepIcon state={step.state} />
              <span className="font-body-base text-body-base">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
