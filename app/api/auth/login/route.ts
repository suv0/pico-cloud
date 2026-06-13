import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { logEvent } from '@/lib/audit/logger';
import { readJsonBody } from '@/lib/api/readJsonBody';

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const json = await readJsonBody(req);
  if (!json.ok) {
    return NextResponse.json({ error: json.error }, { status: 400 });
  }
  const body = json.body;
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Constant-time response: run bcrypt on a real cost-12 hash so that
    // non-existent email does not return faster than a valid-email/wrong-password.
    // The decoy hash was precomputed from bcrypt.hash('decoy...', 12) and is a
    // valid $2a$12$ blob — bcryptjs will perform the full cost-12 computation.
    await bcrypt.compare(password, '$2a$12$lTMqvY3ttvXmE0LO2qel8uZ7NDaJ1PyL8nXrLG4hcY9BmWojlXRIa');
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await logEvent('user', user.id, 'USER_LOGGED_IN', undefined, user.id);

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({ userId: user.id, email: user.email, role: user.role });
}
