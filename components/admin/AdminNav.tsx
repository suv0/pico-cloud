'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/packages', label: 'Packages', exact: false },
  { href: '/admin/unit-prices', label: 'Unit Prices', exact: false },
  { href: '/admin/customers', label: 'Customers', exact: false },
  { href: '/admin/invoices', label: 'Invoices', exact: false },
];

const DESKTOP_NAV_QUERY = '(min-width: 768px)';

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

function useDesktopNav(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_NAV_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

function navLinkClass(active: boolean, mobile: boolean): string {
  if (mobile) {
    return active
      ? 'rounded-lg px-3 py-2 font-body-base text-body-base text-primary bg-primary-container'
      : 'rounded-lg px-3 py-2 font-body-base text-body-base text-on-surface-variant hover:bg-surface-container-low';
  }
  return active
    ? 'border-b-2 border-primary pb-1 font-body-base text-body-base text-primary transition-colors'
    : 'font-body-base text-body-base text-on-surface-variant transition-colors hover:text-primary';
}

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useDesktopNav();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-grid-gutter">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="font-display-title text-display-title font-bold text-primary transition-opacity hover:opacity-80"
            >
              PICO Cloud
            </Link>
            <span className="rounded-full bg-tertiary-container px-2.5 py-0.5 font-label-caps text-[10px] uppercase tracking-widest text-on-tertiary-container">
              Admin
            </span>
          </div>
          {isDesktop && (
            <div className="flex items-center gap-6">
              {NAV_LINKS.map(({ href, label, exact }) => {
                const active = isActive(pathname, href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    className={navLinkClass(active, false)}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant">{email}</span>
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="material-symbols-outlined rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? 'close' : 'menu'}
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="material-symbols-outlined rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
            title="Sign out"
            aria-label="Sign out"
          >
            logout
          </button>
        </div>
      </nav>
      {!isDesktop && mobileOpen && (
        <div className="flex flex-col gap-2 border-t border-outline-variant bg-surface px-grid-gutter py-3">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = isActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(active, true)}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
