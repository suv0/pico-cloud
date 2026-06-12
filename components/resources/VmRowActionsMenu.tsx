'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type VmRowActionsMenuProps = {
  resourceId: string;
  status: string;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
};

type MenuAction = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon: string;
};

export function VmRowActionsMenu({
  resourceId,
  status,
  invoiceId,
  invoiceStatus,
}: VmRowActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 180;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;

    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left,
      minWidth: menuWidth,
      zIndex: 9999,
    });

    function onResizeOrScroll() {
      closeMenu();
    }

    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
    };
  }, [open, closeMenu]);

  async function handleRetry() {
    if (!window.confirm('Retry provisioning? This will re-queue the VM from the failed state.')) {
      return;
    }
    setRetryLoading(true);
    setRetryError('');
    closeMenu();
    try {
      const res = await fetch(`/api/resources/${resourceId}/retry`, { method: 'POST' });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (res.ok) {
        router.push(`/resources/${resourceId}`);
        return;
      }
      setRetryError(data.error ?? 'Retry failed');
      router.push(`/resources/${resourceId}#retry`);
    } catch {
      setRetryError('Network error — please try again');
      router.push(`/resources/${resourceId}#retry`);
    } finally {
      setRetryLoading(false);
    }
  }

  const actions: MenuAction[] = [
    {
      key: 'view',
      label: 'View details',
      href: `/resources/${resourceId}`,
      icon: 'visibility',
    },
  ];

  if (status === 'FAILED') {
    actions.push({
      key: 'retry',
      label: retryLoading ? 'Retrying…' : 'Retry provisioning',
      onClick: handleRetry,
      icon: 'refresh',
    });
  }

  if (status === 'ACTIVE' && invoiceId && invoiceStatus === 'UNPAID') {
    actions.push({
      key: 'pay',
      label: 'Pay now',
      href: `/billing/${invoiceId}?pay=1`,
      icon: 'payments',
    });
  }

  if (status === 'ACTIVE' || status === 'FAILED' || status === 'SUSPENDED') {
    actions.push({
      key: 'terminate',
      label: 'Cancel VM',
      href: `/resources/${resourceId}?terminate=1`,
      icon: 'cancel',
    });
  }

  return (
    <>
      <div className="relative inline-block text-left">
        {retryError && (
          <p className="absolute right-0 top-full z-30 mt-1 max-w-[220px] rounded-lg border border-error-container bg-error-container px-2 py-1 text-xs text-error">
            {retryError}
          </p>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="material-symbols-outlined text-on-surface-variant hover:text-on-surface"
          aria-label="More actions"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          more_vert
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={menuStyle}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-card"
        >
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.key}
                href={action.href}
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2 font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  {action.icon}
                </span>
                {action.label}
              </Link>
            ) : (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={action.onClick}
                disabled={retryLoading && action.key === 'retry'}
                className="flex w-full items-center gap-2 px-4 py-2 font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
