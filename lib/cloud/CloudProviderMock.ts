import type { CloudProvider, ProvisionResult, ResourceSpec } from './CloudProvider';
import { MOCK_PROVISION_STEPS, type ProvisionStepKey } from '@/lib/provisioning/steps';
import { shouldSimulateProvisionFailure } from './shouldSimulateProvisionFailure';
import { mockPublicIp } from './mockPublicIp';

function stepDelay(): Promise<void> {
  const ms = 800 + Math.random() * 400;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FAILURE_REASON = 'Simulated provisioning failure: host capacity exceeded';

/**
 * Simulates a real cloud provider API (OpenStack Nova lifecycle).
 *
 * Failure injection: if resource name starts with "fail" (e.g. fail, fail1, fail-test),
 * provisioning fails after allocate_ram with a `failed` progress step.
 *
 * Timing: ~6–8s spread across sub-steps (~800ms–1.2s each).
 */
export class CloudProviderMock implements CloudProvider {
  async provision(
    resourceId: string,
    spec: ResourceSpec,
    onProgress?: (step: ProvisionStepKey) => void | Promise<void>,
  ): Promise<ProvisionResult> {
    const shouldFail = shouldSimulateProvisionFailure(spec.name);

    for (const step of MOCK_PROVISION_STEPS) {
      await stepDelay();
      await onProgress?.(step);

      if (shouldFail && step === 'allocate_ram') {
        await onProgress?.('failed');
        return {
          success: false,
          reason: FAILURE_REASON,
          _novaResponse: {
            id: resourceId,
            status: 'ERROR',
            fault: { message: 'Host capacity exceeded (simulated)' },
          },
        };
      }
    }

    const publicIp = mockPublicIp(resourceId);
    return {
      success: true,
      publicIp,
      _novaResponse: {
        id: resourceId,
        status: 'ACTIVE',
        addresses: { public: [{ addr: publicIp, version: 4 }] },
      },
    };
  }
}
