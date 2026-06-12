import { ResourceStatus } from '@prisma/client';

/**
 * FSM transition table — defines which state changes are allowed.
 *
 * Structured as data, not code, so adding new states (e.g. SUSPENDED, DELETED)
 * means adding one row here — nothing else changes.
 *
 * Any attempt to perform an invalid transition throws immediately,
 * making invalid resource states unrepresentable at runtime.
 */
const VALID_TRANSITIONS: Record<ResourceStatus, ResourceStatus[]> = {
  [ResourceStatus.PENDING]: [ResourceStatus.PROVISIONING, ResourceStatus.FAILED],
  [ResourceStatus.PROVISIONING]: [ResourceStatus.ACTIVE, ResourceStatus.FAILED],
  [ResourceStatus.ACTIVE]: [ResourceStatus.SUSPENDED, ResourceStatus.TERMINATED],
  [ResourceStatus.FAILED]: [ResourceStatus.PENDING, ResourceStatus.TERMINATED],
  [ResourceStatus.SUSPENDED]: [ResourceStatus.ACTIVE, ResourceStatus.TERMINATED],
  [ResourceStatus.TERMINATED]: [],
};

export function canTransition(from: ResourceStatus, to: ResourceStatus): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function assertValidTransition(from: ResourceStatus, to: ResourceStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid FSM transition: ${from} → ${to}`);
  }
}

export function isTerminalStatus(status: ResourceStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export function isInProgressStatus(status: ResourceStatus): boolean {
  return status === ResourceStatus.PENDING || status === ResourceStatus.PROVISIONING;
}

export const RESOURCE_STATUS_VALUES = Object.values(ResourceStatus);

export function isResourceStatus(value: string): value is ResourceStatus {
  return (RESOURCE_STATUS_VALUES as string[]).includes(value);
}
