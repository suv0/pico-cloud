import type { ResourceSpec } from '@/lib/cloud/CloudProvider';
import {
  PROVISION_STEPS,
  formatProvisionStepLabel,
  isProvisionChecklistStep,
  type ProvisionChecklistStepKey,
  type ProvisionStepKey,
} from '@/lib/provisioning/steps';
import type { ResourceStatus } from '@/lib/types/resource';

export type StepState = 'completed' | 'current' | 'upcoming' | 'failed';

export type ProvisionProgressPhase = 'in_progress' | 'success' | 'failed' | 'terminated';

export type ProvisionStepProgress = {
  key: ProvisionChecklistStepKey;
  label: string;
  state: StepState;
};

export type ProvisionProgressView = {
  headline: string;
  steps: ProvisionStepProgress[];
  completedCount: number;
  totalSteps: number;
  phase: ProvisionProgressPhase;
  failureReason?: string;
  publicIp?: string;
};

type AuditEventLike = {
  action: string;
  detail: string | null;
};

type DeriveProvisionProgressOptions = {
  failureReason?: string | null;
  publicIp?: string | null;
};

function extractStepKeys(events: AuditEventLike[]): ProvisionStepKey[] {
  return events
    .filter((ev) => ev.action === 'RESOURCE_PROVISION_STEP' && ev.detail)
    .map((ev) => ev.detail as ProvisionStepKey);
}

function indexOfStep(step: ProvisionChecklistStepKey): number {
  return PROVISION_STEPS.indexOf(step);
}

export function deriveProvisionProgress(
  status: ResourceStatus,
  auditEvents: AuditEventLike[],
  spec: ResourceSpec,
  options: DeriveProvisionProgressOptions = {},
): ProvisionProgressView {
  const totalSteps = PROVISION_STEPS.length;
  const stepKeys = extractStepKeys(auditEvents);
  const checklistStepsSeen = stepKeys.filter(isProvisionChecklistStep);
  const lastStepKey = stepKeys[stepKeys.length - 1];
  const lastChecklistStep = checklistStepsSeen[checklistStepsSeen.length - 1];

  let failedAtKey: ProvisionChecklistStepKey | null = null;
  if (status === 'FAILED' && lastStepKey === 'failed') {
    const lastCompleted = lastChecklistStep ?? 'allocate_ram';
    const failedIndex = Math.min(indexOfStep(lastCompleted) + 1, PROVISION_STEPS.length - 1);
    failedAtKey = PROVISION_STEPS[failedIndex] ?? 'allocate_storage';
  }

  let currentKey: ProvisionChecklistStepKey = 'queued';
  if (status === 'ACTIVE') {
    currentKey = 'finalizing';
  } else if (failedAtKey) {
    currentKey = failedAtKey;
  } else if (lastChecklistStep) {
    currentKey = lastChecklistStep;
  } else if (stepKeys.includes('queued') || status === 'PENDING') {
    currentKey = 'queued';
  }

  const currentIndex = indexOfStep(currentKey);

  const steps: ProvisionStepProgress[] = PROVISION_STEPS.map((key, index) => {
    let state: StepState = 'upcoming';

    if (status === 'ACTIVE') {
      state = 'completed';
    } else if (failedAtKey) {
      if (key === failedAtKey) {
        state = 'failed';
      } else if (index < indexOfStep(failedAtKey)) {
        state = 'completed';
      }
    } else if (index < currentIndex) {
      state = 'completed';
    } else if (index === currentIndex) {
      state = 'current';
    }

    return {
      key,
      label: formatProvisionStepLabel(key, spec),
      state,
    };
  });

  let phase: ProvisionProgressPhase = 'in_progress';
  let completedCount = currentIndex;
  let headline: string;
  let failureReason: string | undefined;
  let publicIp: string | undefined;

  if (status === 'ACTIVE') {
    phase = 'success';
    completedCount = totalSteps;
    headline = 'VM is active';
    publicIp = options.publicIp ?? undefined;
  } else if (status === 'FAILED') {
    phase = 'failed';
    completedCount = failedAtKey ? indexOfStep(failedAtKey) : currentIndex;
    headline = 'Provisioning failed';
    failureReason = options.failureReason ?? undefined;
  } else if (status === 'SUSPENDED') {
    phase = 'success';
    completedCount = totalSteps;
    headline = 'VM suspended — payment overdue';
  } else if (status === 'TERMINATED') {
    phase = 'terminated';
    completedCount = totalSteps;
    headline = 'VM was cancelled';
  } else if (status === 'PENDING' && stepKeys.length === 0) {
    headline = 'Queued…';
    completedCount = 0;
  } else {
    headline = formatProvisionStepLabel(currentKey, spec);
    completedCount = currentIndex;
  }

  return {
    headline,
    steps,
    completedCount,
    totalSteps,
    phase,
    ...(failureReason ? { failureReason } : {}),
    ...(publicIp ? { publicIp } : {}),
  };
}
