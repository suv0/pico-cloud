type PlatformComponent = {
  slug: string;
  name: string;
  status: string;
  description: string | null;
  updatedAt: string;
};

type ComponentStatus = 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE';

const STATUS_STYLES: Record<ComponentStatus, { badge: string; dot: string; label: string }> = {
  OPERATIONAL: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
    label: 'Operational',
  },
  DEGRADED: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Degraded',
  },
  MAJOR_OUTAGE: {
    badge: 'bg-red-50 text-red-700 border-red-100',
    dot: 'bg-red-500',
    label: 'Major outage',
  },
};

function componentStatusStyle(status: string) {
  if (status === 'OPERATIONAL' || status === 'DEGRADED' || status === 'MAJOR_OUTAGE') {
    return STATUS_STYLES[status];
  }
  return STATUS_STYLES.OPERATIONAL;
}

export function PlatformStatusGrid({ components }: { components: PlatformComponent[] }) {
  return (
    <div className="grid grid-cols-1 gap-element-gap sm:grid-cols-2">
      {components.map((component) => {
        const style = componentStatusStyle(component.status);
        return (
          <div
            key={component.slug}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-section-title text-section-title text-on-surface">{component.name}</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body-sm text-body-sm font-semibold ${style.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
            {component.description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{component.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
