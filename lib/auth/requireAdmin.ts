import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import {
  getValidatedSession,
  getValidatedSessionForRoute,
  type ValidSession,
} from '@/lib/auth/session';

export type AdminSession = ValidSession & { role: typeof UserRole.ADMIN };

export function isAdminRole(role: string): role is typeof UserRole.ADMIN {
  return role === UserRole.ADMIN;
}

export async function getApiAdminSession(): Promise<AdminSession | NextResponse> {
  const session = await getValidatedSessionForRoute();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { userId: session.userId, email: session.email, role: UserRole.ADMIN };
}

export async function getRequiredAdminSession(): Promise<AdminSession> {
  const session = await getValidatedSession();
  if (!session) {
    redirect('/login?next=/admin');
  }
  if (!isAdminRole(session.role)) {
    redirect('/dashboard');
  }
  return { userId: session.userId, email: session.email, role: UserRole.ADMIN };
}
