import { describe, it, expect } from 'vitest';
import { CloudProviderMock } from '@/lib/cloud/CloudProviderMock';
import { MOCK_PROVISION_STEPS } from '@/lib/provisioning/steps';

const mock = new CloudProviderMock();
const SPEC = { name: 'test-vm', vcpu: 2, ramGb: 4, storageGb: 80 };

describe('CloudProviderMock', () => {
  it('succeeds for a normal VM name', async () => {
    const result = await mock.provision('resource-001', { ...SPEC, name: 'my-web-server' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.publicIp).toMatch(/^203\.0\.113\.\d+$/);
      expect(result._novaResponse.status).toBe('ACTIVE');
    }
  }, 15000);

  it('fails for names starting with "fail"', async () => {
    for (const name of ['fail', 'fail1', 'fail-test']) {
      const result = await mock.provision(`resource-${name}`, { ...SPEC, name });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toContain('capacity');
        expect(result._novaResponse.status).toBe('ERROR');
      }
    }
  }, 45000);

  it('generates different IPs for different resource IDs', async () => {
    const [r1, r2] = await Promise.all([
      mock.provision('resource-aaa', { ...SPEC, name: 'vm-a' }),
      mock.provision('resource-zzz', { ...SPEC, name: 'vm-z' }),
    ]);
    if (r1.success && r2.success) {
      expect(r1.publicIp).toMatch(/^203\.0\.113\.\d+$/);
      expect(r2.publicIp).toMatch(/^203\.0\.113\.\d+$/);
    }
  }, 20000);

  it('calls onProgress in order for a successful provision', async () => {
    const steps: string[] = [];
    await mock.provision('resource-003', { ...SPEC, name: 'progress-test' }, (step) => {
      steps.push(step);
    });
    expect(steps).toEqual([...MOCK_PROVISION_STEPS]);
  }, 15000);

  it('stops after allocate_ram and emits failed for fail-prefixed names', async () => {
    const steps: string[] = [];
    const result = await mock.provision('resource-004', { ...SPEC, name: 'fail-progress' }, (step) => {
      steps.push(step);
    });
    expect(result.success).toBe(false);
    expect(steps).toEqual([
      'connecting',
      'allocate_vcpu',
      'allocate_ram',
      'failed',
    ]);
  }, 15000);
});
