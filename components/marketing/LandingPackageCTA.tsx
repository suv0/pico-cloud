import Link from 'next/link';
import type { ValidSession } from '@/lib/auth/session';

type LandingPackageCTAProps = {
  session: ValidSession | null;
  packageSlug: string;
  highlighted?: boolean;
};

function configureHref(session: ValidSession | null, packageSlug: string): string {
  if (!session) return `/signup?package=${packageSlug}`;
  if (session.role === 'ADMIN') return '/admin';
  if (packageSlug === 'custom') return '/packages/custom/configure';
  return `/packages/${packageSlug}/configure`;
}

export function LandingPackageCTA({ session, packageSlug, highlighted = false }: LandingPackageCTAProps) {
  const isAdmin = session?.role === 'ADMIN';
  const href = configureHref(session, packageSlug);
  const label = isAdmin ? 'Admin console' : packageSlug === 'custom' ? 'Configure' : 'Get started';

  const className = [
    'block w-full rounded-lg py-2.5 text-center font-section-title text-section-title transition-colors',
    highlighted && !isAdmin
      ? 'bg-primary text-on-primary hover:bg-primary-container'
      : isAdmin
        ? 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
        : packageSlug === 'custom'
          ? 'border border-slate-600 text-white hover:bg-white/10'
          : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
  ].join(' ');

  return (
    <Link
      href={href}
      className={className}
      title={
        isAdmin
          ? 'Admin accounts manage pricing — sign in as a customer to provision VMs'
          : undefined
      }
    >
      {label}
    </Link>
  );
}
