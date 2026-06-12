import { NextResponse } from 'next/server';
import { getValidatedSessionForRoute, type ValidSession } from '@/lib/auth/session';

export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';

export async function getApiSession(): Promise<ValidSession | NextResponse> {
  const session = await getValidatedSessionForRoute();
  if (!session) {
    return NextResponse.json(
      { error: SESSION_EXPIRED_MESSAGE },
      { status: 401 },
    );
  }

  return session;
}
