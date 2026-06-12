import { describe, it, expect } from 'vitest';
import { deriveProvisionProgress } from '@/lib/provisioning/progressFromAudit';
import {
  PROVISION_STEPS,
  MOCK_PROVISION_STEPS,
  formatProvisionStepLabel,
} from '@/lib/provisioning/steps';

const SPEC = { name: 'web-01', vcpu: 4, ramGb: 8, storageGb: 100 };

describe('PROVISION_STEPS', () => {
  it('defines the canonical step order', () => {
    expect(PROVISION_STEPS).toEqual([
      'queued',
      'connecting',
      'allocate_vcpu',
      'allocate_ram',
      'allocate_storage',
      'configure_network',
      'assign_ip',
      'finalizing',
    ]);
  });

  it('mock steps omit queued (logged by provisionService)', () => {
    expect(MOCK_PROVISION_STEPS[0]).toBe('connecting');
    expect(MOCK_PROVISION_STEPS).not.toContain('queued');
  });
});

describe('formatProvisionStepLabel', () => {
  it('interpolates spec values for resource steps', () => {
    expect(formatProvisionStepLabel('allocate_vcpu', SPEC)).toBe('Allocating 4 vCPU…');
    expect(formatProvisionStepLabel('allocate_ram', SPEC)).toBe('Allocating 8 GB RAM…');
    expect(formatProvisionStepLabel('allocate_storage', SPEC)).toBe('Provisioning 100 GB SSD…');
  });

  it('uses static labels for infrastructure steps', () => {
    expect(formatProvisionStepLabel('connecting', SPEC)).toBe('Connecting to cloud API…');
    expect(formatProvisionStepLabel('finalizing', SPEC)).toBe('Starting VM and running health checks…');
  });
});

describe('deriveProvisionProgress', () => {
  it('shows Queued headline while PENDING with no step events', () => {
    const view = deriveProvisionProgress('PENDING', [], SPEC);
    expect(view.headline).toBe('Queued…');
    expect(view.phase).toBe('in_progress');
    expect(view.completedCount).toBe(0);
    expect(view.totalSteps).toBe(8);
    expect(view.steps[0]?.state).toBe('current');
    expect(view.steps[1]?.state).toBe('upcoming');
  });

  it('marks completed and current steps during PROVISIONING', () => {
    const events = [
      { action: 'RESOURCE_PROVISION_STEP', detail: 'queued' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'connecting' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'allocate_vcpu' },
    ];
    const view = deriveProvisionProgress('PROVISIONING', events, SPEC);
    expect(view.headline).toBe('Allocating 4 vCPU…');
    expect(view.phase).toBe('in_progress');
    expect(view.completedCount).toBe(2);
    expect(view.steps.filter((s) => s.state === 'completed').map((s) => s.key)).toEqual([
      'queued',
      'connecting',
    ]);
    expect(view.steps.find((s) => s.key === 'allocate_vcpu')?.state).toBe('current');
  });

  it('marks success phase when ACTIVE with full progress and IP', () => {
    const view = deriveProvisionProgress('ACTIVE', [], SPEC, { publicIp: '10.0.1.5' });
    expect(view.phase).toBe('success');
    expect(view.completedCount).toBe(8);
    expect(view.headline).toBe('VM is active');
    expect(view.publicIp).toBe('10.0.1.5');
    expect(view.steps.every((s) => s.state === 'completed')).toBe(true);
  });

  it('marks failed phase with failure reason for fail-* VMs', () => {
    const events = [
      { action: 'RESOURCE_PROVISION_STEP', detail: 'queued' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'connecting' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'allocate_vcpu' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'allocate_ram' },
      { action: 'RESOURCE_PROVISION_STEP', detail: 'failed' },
    ];
    const view = deriveProvisionProgress('FAILED', events, SPEC, {
      failureReason: 'Host capacity exceeded',
    });
    expect(view.phase).toBe('failed');
    expect(view.headline).toBe('Provisioning failed');
    expect(view.failureReason).toBe('Host capacity exceeded');
    expect(view.steps.find((s) => s.key === 'allocate_storage')?.state).toBe('failed');
    expect(view.steps.find((s) => s.key === 'allocate_ram')?.state).toBe('completed');
  });
});
