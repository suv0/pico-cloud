import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 font-display-title text-display-title font-bold text-primary">404</p>
      <h1 className="mb-2 font-section-title text-section-title text-on-surface">Page not found</h1>
      <p className="mb-6 max-w-md text-body-base text-on-surface-variant">
        The page you requested does not exist or may have been moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 font-body-base text-body-base font-semibold text-on-primary hover:opacity-90"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-outline-variant px-4 py-2 font-body-base text-body-base text-primary hover:bg-surface-container-low"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
