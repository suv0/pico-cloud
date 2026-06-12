/**
 * Demo failure injection for CloudProviderMock.
 * Names starting with "fail" simulate a capacity error (fail, fail1, fail-test, …).
 */
export function shouldSimulateProvisionFailure(vmName: string): boolean {
  return vmName.startsWith('fail');
}
