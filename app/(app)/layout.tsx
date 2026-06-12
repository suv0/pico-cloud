import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TopNav } from '@/components/layout/TopNav';
import { getValidatedSession } from '@/lib/auth/session';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidatedSession();
  if (!session) redirect('/login');
  if (session.role === 'ADMIN') redirect('/admin');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav email={session.email} />
      <main className="flex-grow max-w-7xl mx-auto w-full px-grid-gutter py-8">
        {children}
      </main>
      <footer className="bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-center w-full py-8 px-grid-gutter max-w-7xl mx-auto gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-display-title text-display-title text-primary font-bold mb-1">PICO Cloud</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">PICO Cloud — Fiber@Home Global Ltd.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Privacy (Demo)</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Terms (Demo)</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Docs (Demo)</span>
            <Link
              href="/status"
              prefetch={false}
              className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
            >
              Platform status
            </Link>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Support (Demo)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
