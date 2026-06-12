'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ValidSession } from '@/lib/auth/session';

type LandingAuthActionsProps = {
  session: ValidSession | null;
  variant?: 'header' | 'hero';
};

export function LandingAuthActions({ session, variant = 'header' }: LandingAuthActionsProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  if (!session) {
    if (variant === 'hero') {
      return (
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-container sm:w-auto"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="font-body-base text-body-base text-on-surface-variant transition-colors hover:text-primary px-4 py-2"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-6 py-2 font-body-base text-body-base text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
        >
          Get started
        </Link>
      </div>
    );
  }

  const primaryHref = session.role === 'ADMIN' ? '/admin' : '/dashboard';
  const primaryLabel = session.role === 'ADMIN' ? 'Admin console' : 'Dashboard';

  if (variant === 'hero') {
    return (
      <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
        <Link
          href={primaryHref}
          className="w-full rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-container sm:w-auto"
        >
          {primaryLabel}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant">{session.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="font-body-base text-body-base text-on-surface-variant transition-colors hover:text-primary px-4 py-2"
      >
        Sign out
      </button>
      <Link
        href={primaryHref}
        className="rounded-lg bg-primary px-6 py-2 font-body-base text-body-base text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
      >
        {primaryLabel}
      </Link>
    </div>
  );
}
