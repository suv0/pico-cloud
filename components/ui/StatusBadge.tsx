type Status = 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'UNPAID' | 'PAID';

const styles: Record<Status, { badge: string; dot: string }> = {
  PENDING: {
    badge: 'bg-surface-container text-on-surface-variant border-outline-variant',
    dot: 'bg-outline',
  },
  PROVISIONING: {
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-500 animate-pulse',
  },
  ACTIVE: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
  },
  FAILED: {
    badge: 'bg-red-50 text-red-700 border-red-100',
    dot: 'bg-red-500',
  },
  UNPAID: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  PAID: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
  },
};

const labels: Record<Status, string> = {
  PENDING: 'Pending',
  PROVISIONING: 'Provisioning',
  ACTIVE: 'Active',
  FAILED: 'Failed',
  UNPAID: 'Unpaid',
  PAID: 'Paid',
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  const style = styles[s] ?? styles.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-body-sm font-semibold border ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {labels[s] ?? status}
    </span>
  );
}
