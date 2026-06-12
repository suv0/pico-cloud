'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminBillingStatusBanner } from '@/components/billing/AdminBillingStatusBanner';
import { PaymentRequiredBanner } from '@/components/billing/PaymentRequiredBanner';
import { VmNameInput } from '@/components/forms/VmNameInput';
import { MockConsoleModal } from '@/components/resources/MockConsoleModal';
import { ProvisioningProgress } from '@/components/resources/ProvisioningProgress';
import { VmManagePanel } from '@/components/resources/VmManagePanel';
import { VmMetricsPanel } from '@/components/resources/VmMetricsPanel';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { isPaymentGatedForViewer, isPaymentRequired, type ViewerMode } from '@/lib/billing/isPaymentRequired';
import { getRegion } from '@/lib/regions/catalog';
import { isInProgressStatus } from '@/lib/provisioning/fsm';
import { deriveProvisionProgress } from '@/lib/provisioning/progressFromAudit';
import { formatProvisionStepLabel, type ProvisionStepKey } from '@/lib/provisioning/steps';
import { isVmNameValid, normalizeVmName } from '@/lib/validation/vmName';
import type { ResourceStatus } from '@/lib/types/resource';
type Resource = {
  id: string;
  name: string;
  status: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
  regionCode: string;
  monthlyPriceBdt: number;
  publicIp: string | null;
  failureReason: string | null;
  createdAt: string;
  provisionedAt: string | null;
  package: { name: string; slug: string } | null;
  invoice?: { id: string; status: string; amountBdt?: number; paymentDueAt?: string } | null;
};
type AuditEvent = {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
};
type ResourceDetailViewProps = {
  resourceUrl: string;
  auditUrl: string;
  retryUrl?: string;
  patchUrl?: string;
  backHref: string;
  backLabel: string;
  authRedirectHref?: string;
  notFoundMessage?: string;
  viewerMode?: ViewerMode;
};
const ACTION_LABELS: Record<string, string> = {
  RESOURCE_PROVISION_REQUESTED: 'Provision requested',
  RESOURCE_PROVISIONING_STARTED: 'Provisioning started',
  RESOURCE_PROVISIONING_COMPLETE: 'VM is active',
  HEALTH_CHECK_PASSED: 'Health check passed',
  RESOURCE_PROVISIONING_FAILED: 'Provisioning failed',
  RESOURCE_RETRY_REQUESTED: 'Retry requested',
  RESOURCE_RENAMED: 'VM renamed',
  INVOICE_CREATED: 'Invoice created',
  INVOICE_PAID: 'Invoice marked paid',
};
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatTime(iso);
}
function auditSignature(events: AuditEvent[]): string {
  const last = events[events.length - 1];
  const stepCount = events.filter((e) => e.action === 'RESOURCE_PROVISION_STEP').length;
  return `${events.length}:${stepCount}:${last?.id ?? ''}:${last?.detail ?? ''}`;
}
function HardwareSpecsCard({ resource, highlight }: { resource: Resource; highlight?: boolean }) {
  const region = getRegion(resource.regionCode);
  return (
    <Card
      padding={false}
      id="vm-hardware-specs"
      className={highlight ? 'spec-highlight-pulse' : undefined}
    >
      <CardHeader>
        <h2 className="font-section-title text-section-title text-on-surface">Hardware Specs</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {[
          { icon: 'memory', label: 'vCPU', value: `${resource.vcpu} Cores` },
          { icon: 'speed', label: 'RAM', value: `${resource.ramGb} GB` },
          { icon: 'hard_drive', label: 'SSD', value: `${resource.storageGb} GB NVMe` },
          { icon: 'assignment', label: 'Plan', value: resource.package?.name ?? 'Custom' },
          { icon: 'public', label: 'Region', value: region.label },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-outline-variant/30 py-2 last:border-0"
          >
            <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-lg">{icon}</span>
              {label}
            </span>
            <span className="font-code-inline text-code-inline font-bold text-on-surface">{value}</span>
          </div>
        ))}
        <div className="space-y-2 border-t border-outline-variant/30 pt-4 text-body-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Monthly</span>
            <span className="font-semibold text-primary">৳{resource.monthlyPriceBdt.toLocaleString()}</span>
          </div>
          {resource.publicIp && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Public IP</span>
              <span className="font-code-inline text-code-inline text-primary">{resource.publicIp}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
function TimelineCard({
  auditEvents,
  spec,
  loadError,
}: {
  auditEvents: AuditEvent[];
  spec: { name: string; vcpu: number; ramGb: number; storageGb: number };
  loadError?: boolean;
}) {
  return (
    <Card padding={false}>
      <CardHeader>
        <h2 className="font-section-title text-section-title text-on-surface">
          {auditEvents.length > 0 ? 'Activity Timeline' : 'Provisioning Timeline'}
        </h2>
      </CardHeader>
      <CardBody>
        {loadError && (
          <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
            Couldn&apos;t load activity — refresh the page to try again.
          </p>
        )}
        {auditEvents.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No events yet</p>
        ) : (
          <div className="relative space-y-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-outline-variant">
            {[...auditEvents].reverse().map((ev, i) => {
              const isLatest = i === 0;
              return (
                <div key={ev.id} className="relative flex items-start gap-4 pl-0">
                  <div
                    className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isLatest ? 'bg-emerald-500 text-white' : 'border border-outline-variant bg-surface'
                    }`}
                  >
                    {isLatest ? (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-outline" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-body-base text-body-base font-semibold leading-none text-on-surface">
                          {ev.action === 'RESOURCE_PROVISION_STEP' && ev.detail
                            ? formatProvisionStepLabel(ev.detail as ProvisionStepKey, spec)
                            : (ACTION_LABELS[ev.action] ?? ev.action)}
                        </p>
                        {ev.detail && ev.action !== 'RESOURCE_PROVISION_STEP' && (
                          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{ev.detail}</p>
                        )}
                      </div>
                      <time className="shrink-0 font-label-caps text-[10px] uppercase text-outline">
                        {formatRelative(ev.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
function RegionCard({ regionCode, isProvisioning }: { regionCode: string; isProvisioning: boolean }) {
  const region = getRegion(regionCode);
  return (
    <Card padding={false} className="overflow-hidden">
      <CardHeader>
        <h2 className="font-section-title text-section-title text-on-surface">Region</h2>
      </CardHeader>
      <CardBody>
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high p-4 text-center">
          <Image
            src={region.mapAsset}
            alt={`${region.label} map`}
            fill
            className="object-cover opacity-80"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="relative z-10 rounded-lg bg-surface-container-lowest/90 px-4 py-2 backdrop-blur-sm">
            <p className="mb-1 font-label-caps text-label-caps uppercase text-on-surface-variant">Region map</p>
            <p className="font-body-base text-body-base font-semibold text-primary">
              {isProvisioning ? `Provisioning in ${region.label}` : region.label}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
export function ResourceDetailView({
  resourceUrl,
  auditUrl,
  retryUrl,
  patchUrl,
  backHref,
  backLabel,
  authRedirectHref = '/login',
  notFoundMessage = 'VM not found',
  viewerMode = 'customer',
}: ResourceDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedRetryUrl = retryUrl ?? `${resourceUrl}/retry`;
  const resolvedPatchUrl = patchUrl ?? resourceUrl;
  const [resource, setResource] = useState<Resource | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoadError, setAuditLoadError] = useState(false);
  const [error, setError] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [renameName, setRenameName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [specHighlight, setSpecHighlight] = useState(false);
  const [bannerHighlight, setBannerHighlight] = useState(false);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [simulateGraceLoading, setSimulateGraceLoading] = useState(false);
  const auditSigRef = useRef('');
  const retryPanelRef = useRef<HTMLDivElement>(null);
  const fetchResource = useCallback(async () => {
    try {
      const res = await fetch(resourceUrl);
      if (res.status === 401) {
        router.push(authRedirectHref);
        return;
      }
      if (res.status === 403) {
        setError('You are not allowed to view this VM');
        return;
      }
      if (res.status === 404) {
        setError(notFoundMessage);
        return;
      }
      if (!res.ok) {
        setError('Failed to load VM');
        return;
      }
      const data = await res.json() as Resource;
      setResource(data);
      setRenameName(data.name);
      return data;
    } catch {
      setError('Network error — please refresh the page');
      return;
    }
  }, [authRedirectHref, notFoundMessage, resourceUrl, router]);
  const fetchAudit = useCallback(async () => {
    const res = await fetch(auditUrl);
    if (res.ok) {
      setAuditLoadError(false);
      const events = await res.json() as AuditEvent[];
      const sig = auditSignature(events);
      if (sig !== auditSigRef.current) {
        auditSigRef.current = sig;
        setAuditEvents(events);
      }
    } else {
      setAuditLoadError(true);
    }
  }, [auditUrl]);
  useEffect(() => {
    void Promise.all([fetchResource(), fetchAudit()]);
  }, [fetchResource, fetchAudit]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      if (!resource || resource.status !== 'ACTIVE') return;
      void fetchResource();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [resource, fetchResource]);
  useEffect(() => {
    if (!resource) return;
    if (!isInProgressStatus(resource.status as ResourceStatus)) return;
    const interval = setInterval(async () => {
      const updated = await fetchResource();
      void fetchAudit();
      if (updated && !isInProgressStatus(updated.status as ResourceStatus)) {
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [resource, fetchResource, fetchAudit]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#retry') return;
    retryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [resource]);

  useEffect(() => {
    if (viewerMode === 'admin') return;
    if (searchParams.get('payment') !== 'required') return;
    if (!resource || !isPaymentGatedForViewer(viewerMode, resource)) return;
    setBannerHighlight(true);
    const timer = window.setTimeout(() => {
      document.getElementById('payment-required-banner')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    const clearHighlight = window.setTimeout(() => setBannerHighlight(false), 3000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [searchParams, resource, viewerMode]);

  function handleHighlightSpecs() {
    setSpecHighlight(true);
    window.setTimeout(() => setSpecHighlight(false), 1500);
  }

  function handleConsoleClick() {
    if (!resource) return;
    if (isPaymentGatedForViewer(viewerMode, resource) && resource.invoice) {
      router.push(`/billing/${resource.invoice.id}?pay=1`);
      return;
    }
    setConsoleOpen(true);
  }
  async function handleSaveName() {
    if (!resource) return;
    setRenameLoading(true);
    setRenameError('');
    try {
      const res = await fetch(resolvedPatchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizeVmName(renameName) }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setRenameError((data as { error?: string }).error ?? 'Rename failed');
        return;
      }
      setResource(data as Resource);
      setRenameName((data as Resource).name);
      auditSigRef.current = '';
      void fetchAudit();
    } finally {
      setRenameLoading(false);
    }
  }
  async function handleRetry() {
    if (!resource) return;
    if (!window.confirm('Retry provisioning? This will re-queue the VM from the failed state.')) {
      return;
    }
    setRetryLoading(true);
    setRetryError('');
    try {
      const normalized = normalizeVmName(renameName);
      if (normalized !== resource.name) {
        const patchRes = await fetch(resolvedPatchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: normalized }),
        });
        const patchData: unknown = await patchRes.json();
        if (!patchRes.ok) {
          setRetryError((patchData as { error?: string }).error ?? 'Rename failed');
          return;
        }
        setResource(patchData as Resource);
        setRenameName((patchData as Resource).name);
      }
      const res = await fetch(resolvedRetryUrl, { method: 'POST' });
      const data: unknown = await res.json();
      if (!res.ok) {
        setRetryError((data as { error?: string }).error ?? 'Retry failed');
        return;
      }
      setResource(data as Resource);
      setRenameName((data as Resource).name);
      auditSigRef.current = '';
      void fetchAudit();
    } finally {
      setRetryLoading(false);
    }
  }
  async function handleTerminate() {
    if (!resource) return;
    if (!window.confirm('Cancel this VM? This action cannot be undone.')) return;
    setTerminateLoading(true);
    try {
      const res = await fetch(`${resourceUrl}/terminate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as Resource;
        setResource(data);
        auditSigRef.current = '';
        void fetchAudit();
      }
    } catch {
      // best-effort
    } finally {
      setTerminateLoading(false);
    }
  }
  async function handleSimulateGrace() {
    if (!resource) return;
    setSimulateGraceLoading(true);
    try {
      const res = await fetch(`${resourceUrl}/simulate-grace-expiry`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as Resource;
        setResource(data);
        setRenameName(data.name);
        auditSigRef.current = '';
        void fetchAudit();
      }
    } catch {
      // best-effort
    } finally {
      setSimulateGraceLoading(false);
    }
  }
  useEffect(() => {
    if (searchParams.get('paid') !== '1') return;
    router.replace(window.location.pathname);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium text-error">{error}</p>
        <Link href={backHref} className="mt-4 inline-block text-body-sm text-primary hover:underline">
          ← Back to {backLabel}
        </Link>
      </div>
    );
  }
  if (!resource) return <LoadingSpinner />;
  const spec = {
    name: resource.name,
    vcpu: resource.vcpu,
    ramGb: resource.ramGb,
    storageGb: resource.storageGb,
  };
  const provisionProgress = deriveProvisionProgress(
    resource.status as ResourceStatus,
    auditEvents,
    spec,
    {
      failureReason: resource.failureReason,
      publicIp: resource.publicIp,
    },
  );
  const isActive = resource.status === 'ACTIVE';
  const isFailed = resource.status === 'FAILED';
  const isProvisioning = isInProgressStatus(resource.status as ResourceStatus);
  const showProgressCard =
    isProvisioning || resource.status === 'ACTIVE' || resource.status === 'FAILED';
  const nameChanged = normalizeVmName(renameName) !== resource.name;
  const paymentRequired = isPaymentGatedForViewer(viewerMode, resource);
  const customerAccessLimited = viewerMode === 'admin' && isPaymentRequired(resource);
  const invoiceId = resource.invoice?.id;
  const invoiceAmountBdt = resource.invoice?.amountBdt ?? resource.monthlyPriceBdt;
  const showPaidBanner = searchParams.get('paid') === '1' && resource.status === 'ACTIVE' && !paymentRequired;

  return (
    <>
      {showPaidBanner && (
        <div className="mb-section-gap flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-emerald-900">
          <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
          <div>
            <p className="font-section-title text-section-title">Payment successful — VM is now fully unlocked.</p>
            <p className="mt-0.5 font-body-sm text-body-sm text-emerald-800">Console access, live metrics, and usage history are now available.</p>
          </div>
        </div>
      )}
      {paymentRequired && invoiceId && (
        <PaymentRequiredBanner
          amountBdt={invoiceAmountBdt}
          invoiceId={invoiceId}
          paymentDueAt={resource.invoice?.paymentDueAt ?? null}
          highlight={bannerHighlight}
        />
      )}
      {customerAccessLimited && (
        <AdminBillingStatusBanner amountBdt={invoiceAmountBdt} />
      )}
      <div className="mb-section-gap">
        <nav className="mb-2 flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <Link href={backHref} prefetch={false} className="hover:text-primary">
            {backLabel}
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface">{resource.name}</span>
        </nav>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <h1 className="font-display-title text-display-title">{resource.name}</h1>
            <StatusBadge status={resource.status} />
            {paymentRequired && <StatusBadge status="UNPAID" />}
            {customerAccessLimited && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-body-sm text-body-sm font-medium text-amber-800">
                Customer access: limited
              </span>
            )}
          </div>
          {(isActive || isFailed || resource.status === 'SUSPENDED') && (
            <div className="flex flex-wrap items-center gap-element-gap">
              {paymentRequired && invoiceId ? (
                <Link
                  href={`/billing/${invoiceId}?pay=1`}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-body-base font-semibold text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Pay now
                </Link>
              ) : null}
              {isActive && (
                <button
                  type="button"
                  onClick={handleConsoleClick}
                  disabled={!resource.publicIp && !paymentRequired}
                  title={
                    paymentRequired
                      ? 'Payment required to unlock console access'
                      : !resource.publicIp
                        ? 'Public IP not assigned yet'
                        : 'Open demo console'
                  }
                  className={`flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60 ${
                    paymentRequired ? 'opacity-60' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                  Console
                </button>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Manage
                </button>
              )}
              {isActive && invoiceId && resource.invoice?.status === 'UNPAID' && (
                <button
                  type="button"
                  onClick={handleSimulateGrace}
                  disabled={simulateGraceLoading}
                  className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 font-body-base text-body-base text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">fast_forward</span>
                  {simulateGraceLoading ? 'Simulating…' : 'Simulate 7-day grace expiry'}
                </button>
              )}
              {resource.status !== 'PENDING' && resource.status !== 'PROVISIONING' && resource.status !== 'TERMINATED' && (
                <button
                  type="button"
                  onClick={handleTerminate}
                  disabled={terminateLoading}
                  className="flex items-center gap-2 rounded-lg border border-error-container bg-error-container px-4 py-2 font-body-base text-body-base text-error transition-colors hover:bg-red-100 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  {terminateLoading ? 'Cancelling…' : 'Cancel VM'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {resource.publicIp && !paymentRequired && (
        <MockConsoleModal
          open={consoleOpen}
          onClose={() => setConsoleOpen(false)}
          vmName={resource.name}
          publicIp={resource.publicIp}
        />
      )}
      <VmManagePanel
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        resource={resource}
        backHref={backHref}
        backLabel={backLabel}
        viewerMode={viewerMode}
        paymentRequired={paymentRequired}
        customerAccessLimited={customerAccessLimited}
        onOpenConsole={handleConsoleClick}
        onHighlightSpecs={handleHighlightSpecs}
      />
      <div className="grid grid-cols-1 gap-grid-gutter md:grid-cols-12">
        <div className="space-y-grid-gutter md:col-span-8">
          {showProgressCard && (
            <ProvisioningProgress
              progress={provisionProgress}
              paymentRequired={paymentRequired}
              monthlyPriceBdt={resource.monthlyPriceBdt}
              {...(invoiceId ? { invoiceId } : {})}
            />
          )}
          {isFailed && (
            <div
              id="retry"
              ref={retryPanelRef}
              className="rounded-xl border border-error/20 bg-error-container p-container-padding"
            >
              <h3 className="mb-2 font-section-title text-section-title text-on-error-container">
                Provisioning failed
              </h3>
              {resource.failureReason && (
                <p className="mb-4 font-body-sm text-body-sm text-on-error-container">{resource.failureReason}</p>
              )}
              <div className="mb-3 max-w-md">
                <VmNameInput inputId="failed-vm-name" value={renameName} onChange={setRenameName} />
              </div>
              {renameError && (
                <p className="mb-4 font-body-sm text-body-sm font-medium text-error">{renameError}</p>
              )}
              {retryError && (
                <p className="mb-4 font-body-sm text-body-sm font-medium text-error">{retryError}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {nameChanged && (
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={renameLoading || !isVmNameValid(renameName)}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-base font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
                  >
                    {renameLoading ? 'Saving…' : 'Save name'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retryLoading || !isVmNameValid(renameName)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-body-base font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
                >
                  {retryLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {nameChanged ? 'Renaming & retrying…' : 'Retrying…'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      {nameChanged ? 'Rename & retry' : 'Retry provisioning'}
                    </>
                  )}
                </button>
              </div>
              <p className="mt-3 font-body-sm text-body-sm text-on-error-container/80">
                Names starting with <span className="font-code-inline">fail</span> will fail again unless
                renamed.
              </p>
            </div>
          )}
          {isActive && (
            <VmMetricsPanel
              resourceId={resource.id}
              resourceUrl={resourceUrl}
              vcpu={resource.vcpu}
              ramGb={resource.ramGb}
              locked={paymentRequired}
              {...(invoiceId ? { invoiceId } : {})}
            />
          )}
          {isProvisioning && (
            <TimelineCard auditEvents={auditEvents} spec={spec} loadError={auditLoadError} />
          )}
        </div>
        <div className="space-y-grid-gutter md:col-span-4">
          <HardwareSpecsCard resource={resource} highlight={specHighlight} />
          {isProvisioning && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-container-padding">
              <h3 className="mb-2 flex items-center gap-2 font-body-base text-body-base font-semibold">
                <span className="material-symbols-outlined text-primary">info</span>
                Note
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Your public IP appears here once the &quot;Public IP assignment&quot; step completes.
              </p>
            </div>
          )}
          {isActive ? (
            <>
              <TimelineCard auditEvents={auditEvents} spec={spec} loadError={auditLoadError} />
              <RegionCard regionCode={resource.regionCode} isProvisioning={false} />
            </>
          ) : (
            <RegionCard regionCode={resource.regionCode} isProvisioning={isProvisioning} />
          )}
        </div>
      </div>
    </>
  );
}
