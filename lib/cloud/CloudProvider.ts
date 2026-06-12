import type { ProvisionStepKey } from '@/lib/provisioning/steps';

/**
 * CloudProvider interface — the contract for infrastructure provisioning.
 *
 * Today's implementation: CloudProviderMock (simulated delay + fake IP).
 * Production swap: implement OpenStackProvider with Nova API calls.
 * Only provisionService.ts knows which implementation is active.
 *
 * The response shape mirrors OpenStack Nova server lifecycle:
 *   POST /v2.1/servers → BUILD → ACTIVE | ERROR
 */

export type ResourceSpec = {
  name: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
};

export type ProvisionProgressCallback = (step: ProvisionStepKey) => void | Promise<void>;

export type ProvisionResult =
  | {
      success: true;
      publicIp: string;
      /** OpenStack-shaped metadata for documentation/interview purposes */
      _novaResponse: {
        id: string;
        status: 'ACTIVE';
        addresses: { public: Array<{ addr: string; version: 4 }> };
      };
    }
  | {
      success: false;
      reason: string;
      _novaResponse: {
        id: string;
        status: 'ERROR';
        fault: { message: string };
      };
    };

export interface CloudProvider {
  provision(
    resourceId: string,
    spec: ResourceSpec,
    onProgress?: ProvisionProgressCallback,
  ): Promise<ProvisionResult>;
}
