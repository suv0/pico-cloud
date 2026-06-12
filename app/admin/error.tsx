'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-error">error</span>
      <h1 className="mb-2 font-display-title text-display-title text-on-surface">Something went wrong</h1>
      <p className="mb-6 max-w-md text-body-base text-on-surface-variant">
        An unexpected error occurred in the admin console. You can try again or return to the admin home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 font-body-base text-body-base font-semibold text-on-primary hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-lg border border-outline-variant px-4 py-2 font-body-base text-body-base text-primary hover:bg-surface-container-low"
        >
          Back to admin
        </Link>
      </div>
    </div>
  );
}
