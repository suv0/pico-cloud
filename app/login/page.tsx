'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AuthBrand, AuthFooterLinks, AuthInfoCards } from '@/components/auth/AuthBrand';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageParam = searchParams.get('package');
  const nextParam = searchParams.get('next');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function redirectPath(role?: string) {
    if (nextParam) return nextParam;
    if (packageParam === 'custom') return '/packages/custom/configure';
    if (packageParam) return `/packages/${packageParam}/configure`;
    if (role === 'ADMIN') return '/admin';
    return '/dashboard';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Login failed');
        return;
      }
      const loginData = data as { role?: string };
      router.push(redirectPath(loginData.role));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-base text-body-base text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-grid-gutter py-12">
      <main className="relative z-10 w-full max-w-[440px]">
        <AuthBrand />

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="mb-2 font-section-title text-section-title text-on-surface">Sign in to PICO</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Access your cloud console</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-error/20 bg-error-container p-4">
              <span className="material-symbols-outlined text-[20px] text-error">error</span>
              <p className="font-body-sm text-body-sm font-medium text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-element-gap">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@demo.pico"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="demo1234"
                className={inputClass}
              />
            </div>

            <Button type="submit" loading={loading} className="mt-4 w-full" size="lg">
              Sign in
              {!loading && (
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3 text-center text-xs text-on-surface-variant">
            <p>
              Demo customer:{' '}
              <span className="font-code-inline font-medium">customer@demo.pico</span> /{' '}
              <span className="font-code-inline font-medium">demo1234</span>
            </p>
            <p>
              Demo admin:{' '}
              <span className="font-code-inline font-medium">admin@test.com</span> /{' '}
              <span className="font-code-inline font-medium">123123123</span>
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setForm({ email: 'customer@demo.pico', password: 'demo1234' })}
                className="rounded-md border border-outline-variant px-3 py-1 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                Fill customer demo
              </button>
              <button
                type="button"
                onClick={() => setForm({ email: 'admin@test.com', password: '123123123' })}
                className="rounded-md border border-outline-variant px-3 py-1 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                Fill admin demo
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-outline-variant pt-6 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No account?{' '}
              <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <AuthInfoCards />
        <AuthFooterLinks />
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
