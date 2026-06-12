import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/auth/session';
import { getSessionPassword } from '@/lib/auth/session';

const PROTECTED_PREFIXES = ['/dashboard', '/packages', '/resources', '/billing'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(req.cookies as any, {
    password: getSessionPassword(),
    cookieName: 'pico-session',
  });

  const isLoggedIn = Boolean(session.userId);

  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Valid-session redirect for auth pages is handled in app/login/layout.tsx
  // and app/signup/layout.tsx (requires a DB check — not available in middleware).

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/packages/:path*', '/resources/:path*', '/billing/:path*'],
};
