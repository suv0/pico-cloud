import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { logEvent } from '@/lib/audit/logger';
import { readJsonBody } from '@/lib/api/readJsonBody';

const SignupBody = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(64),
});

export async function POST(req: NextRequest) {
  const json = await readJsonBody(req);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 400 });
  }
  const body = json.body;
  const parsed = SignupBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const { email, password, displayName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  // bcrypt.hash generates a unique salt automatically — cost factor 12
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash, displayName, role: 'CUSTOMER' },
  });

  await logEvent('user', user.id, 'USER_SIGNED_UP', undefined, user.id);

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json(
    { userId: user.id, email: user.email, role: user.role },
    { status: 201 },
  );
}
