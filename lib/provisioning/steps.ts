import type { ResourceSpec } from '@/lib/cloud/CloudProvider';

export type ProvisionStepKey =
  | 'queued'
  | 'connecting'
  | 'allocate_vcpu'
  | 'allocate_ram'
  | 'allocate_storage'
  | 'configure_network'
  | 'assign_ip'
  | 'finalizing'
  | 'failed';

/** Ordered checklist steps — source of truth for UI (excludes terminal `failed` pseudo-step). */
export const PROVISION_STEPS = [
  'queued',
  'connecting',
  'allocate_vcpu',
  'allocate_ram',
  'allocate_storage',
  'configure_network',
  'assign_ip',
  'finalizing',
] as const satisfies readonly ProvisionStepKey[];

export type ProvisionChecklistStepKey = (typeof PROVISION_STEPS)[number];

const STEP_LABELS: Record<ProvisionChecklistStepKey, (spec: ResourceSpec) => string> = {
  queued: () => 'Validating request and queuing VM…',
  connecting: () => 'Connecting to cloud API…',
  allocate_vcpu: (spec) => `Allocating ${spec.vcpu} vCPU…`,
  allocate_ram: (spec) => `Allocating ${spec.ramGb} GB RAM…`,
  allocate_storage: (spec) => `Provisioning ${spec.storageGb} GB SSD…`,
  configure_network: () => 'Configuring network and security groups…',
  assign_ip: () => 'Assigning public IP address…',
  finalizing: () => 'Starting VM and running health checks…',
};

export function formatProvisionStepLabel(
  step: ProvisionStepKey,
  spec: ResourceSpec,
): string {
  if (step === 'failed') {
    return 'Provisioning failed';
  }
  return STEP_LABELS[step](spec);
}

export function isProvisionChecklistStep(step: string): step is ProvisionChecklistStepKey {
  return (PROVISION_STEPS as readonly string[]).includes(step);
}

/** Steps emitted by CloudProviderMock (queued is logged by provisionService). */
export const MOCK_PROVISION_STEPS: ProvisionChecklistStepKey[] = [
  'connecting',
  'allocate_vcpu',
  'allocate_ram',
  'allocate_storage',
  'configure_network',
  'assign_ip',
  'finalizing',
];
