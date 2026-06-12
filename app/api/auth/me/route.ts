import { NextResponse } from 'next/server';
import { getValidatedSessionForRoute } from '@/lib/auth/session';

export async function GET() {
  const session = await getValidatedSessionForRoute();
  if (!session) {
    return NextResponse.json(
      { error: 'Session expired. Please sign in again.' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    role: session.role,
  });
}
