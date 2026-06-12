import { AdminNav } from '@/components/admin/AdminNav';
import { getRequiredAdminSession } from '@/lib/auth/requireAdmin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getRequiredAdminSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminNav email={session.email} />
      <main className="mx-auto w-full max-w-7xl flex-grow px-grid-gutter py-8">{children}</main>
      <footer className="border-t border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-grid-gutter py-8 md:flex-row">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            PICO Admin Console — pricing & customer overview
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Fiber@Home Global Ltd.</p>
        </div>
      </footer>
    </div>
  );
}
