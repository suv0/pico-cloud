'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AuthBrand, AuthFooterLinks, AuthInfoCards } from '@/components/auth/AuthBrand';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageParam = searchParams.get('package');

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function nextPath() {
    if (packageParam === 'custom') return '/packages/custom/configure';
    if (packageParam) return `/packages/${packageParam}/configure`;
    return '/dashboard';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Sign up failed');
        return;
      }
      router.push(nextPath());
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
            <h2 className="mb-2 font-section-title text-section-title text-on-surface">
              Create your account
            </h2>
            {packageParam && (
              <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-high px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  You selected:{' '}
                  <span className="font-semibold capitalize text-on-surface">{packageParam}</span>
                </p>
              </div>
            )}
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
                htmlFor="display-name"
                className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="John Doe"
                className={inputClass}
              />
            </div>
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
                placeholder="name@company.com"
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
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className={inputClass}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
                At least 8 characters.
              </p>
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <Button type="submit" loading={loading} className="mt-4 w-full" size="lg">
              Create account
              {!loading && (
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-outline-variant pt-6 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link
                href={packageParam ? `/login?package=${packageParam}` : '/login'}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Sign in
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
