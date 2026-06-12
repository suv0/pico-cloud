'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/packages', label: 'New VM' },
  { href: '/resources', label: 'My VMs' },
  { href: '/billing', label: 'Billing' },
];

const DESKTOP_NAV_QUERY = '(min-width: 768px)';

function isActive(pathname: string, href: string): boolean {
  if (href === '/resources' || href === '/billing') return pathname === href;
  if (href === '/dashboard') return pathname === '/dashboard';
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

export function TopNav({ email }: { email: string }) {
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
    <header className="bg-surface sticky top-0 z-50 border-b border-outline-variant">
      <nav className="flex justify-between items-center w-full px-grid-gutter h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 md:gap-8">
          <Link
            href="/"
            className="font-display-title text-display-title font-bold text-primary transition-opacity hover:opacity-80"
          >
            PICO Cloud
          </Link>
          {isDesktop && (
            <div className="flex gap-6 items-center">
              {NAV_LINKS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    className={
                      active
                        ? 'font-body-base text-body-base text-primary border-b-2 border-primary pb-1 transition-colors'
                        : 'font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors'
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant">
            {email}
          </span>
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? 'close' : 'menu'}
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            logout
          </button>
        </div>
      </nav>
      {!isDesktop && mobileOpen && (
        <div className="border-t border-outline-variant bg-surface px-grid-gutter py-3 flex flex-col gap-2">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className={
                  active
                    ? 'rounded-lg px-3 py-2 font-body-base text-body-base text-primary bg-primary-container'
                    : 'rounded-lg px-3 py-2 font-body-base text-body-base text-on-surface-variant hover:bg-surface-container-low'
                }
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
