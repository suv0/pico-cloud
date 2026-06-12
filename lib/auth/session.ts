import { cache } from 'react';
import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export type SessionData = {
  userId?: string;
  email?: string;
};

export type ValidSession = {
  userId: string;
  email: string;
  role: string;
};

export function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return secret ?? 'fallback-secret-32-chars-min-dev';
}

const SESSION_OPTIONS: SessionOptions = {
  password: getSessionPassword(),
  cookieName: 'pico-session',
  cookieOptions: {
    secure:
      process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h demo sessions
  },
};

export async function getSession() {
  // iron-session v8 + Next.js 15 cookie types require the cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<SessionData>(await cookies() as any, SESSION_OPTIONS);
}

/** Clear a stale or signed-out session cookie. */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
  await session.save();
}

export type GetValidatedSessionOptions = {
  /** Route Handlers only — clears cookie when DB user is missing. */
  clearStale?: boolean;
};

/**
 * Read-only session validation for Server Components and layouts.
 * Returns null when the cookie is empty or the user no longer exists in the DB.
 * Does not mutate cookies — stale cookies are cleared in Route Handlers instead.
 */
const getValidatedSessionImpl = cache(
  async (clearStale: boolean): Promise<ValidSession | null> => {
    const session = await getSession();
    if (!session.userId || !session.email) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      if (clearStale) {
        session.destroy();
        await session.save();
      }
      return null;
    }

    return { userId: user.id, email: user.email, role: user.role };
  },
);

export async function getValidatedSession(
  options?: GetValidatedSessionOptions,
): Promise<ValidSession | null> {
  return getValidatedSessionImpl(Boolean(options?.clearStale));
}

/**
 * Validated session for Route Handlers — clears stale cookies when the DB user is missing.
 */
export async function getValidatedSessionForRoute(): Promise<ValidSession | null> {
  return getValidatedSession({ clearStale: true });
}

export async function getRequiredSession(): Promise<ValidSession> {
  const session = await getValidatedSession();
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return session;
}
