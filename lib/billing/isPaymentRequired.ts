export type ViewerMode = 'customer' | 'admin';

function isBillingGatedStatus(status: string): boolean {
  return status === 'ACTIVE' || status === 'SUSPENDED';
}

export function isPaymentRequired(resource: {
  status: string;
  invoice?: { status: string } | null;
}): boolean {
  if (!isBillingGatedStatus(resource.status)) {
    return false;
  }
  if (!resource.invoice) {
    return true;
  }
  return resource.invoice.status === 'UNPAID';
}

/** UI payment gating — ops admin must not see customer pay flows (D-018). */
export function isPaymentGatedForViewer(
  viewerMode: ViewerMode,
  resource: Parameters<typeof isPaymentRequired>[0],
): boolean {
  return viewerMode === 'customer' && isPaymentRequired(resource);
}
