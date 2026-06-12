import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: Breadcrumb[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="mb-section-gap flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-2 text-on-surface-variant text-body-sm mb-1">
            {breadcrumb.map((item, i) => (
              <span key={`${item.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <Icon name="chevron-right" size={14} className="text-outline" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    {...(item.href.startsWith('/admin') ? { prefetch: false } : {})}
                    className="hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-primary font-semibold">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display-title text-display-title text-on-surface">{title}</h1>
        {description && (
          <p className="text-on-surface-variant font-body-base text-body-base mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
