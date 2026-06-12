import { redirect } from 'next/navigation';
import { getValidatedSession } from '@/lib/auth/session';

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidatedSession();
  if (session) {
    redirect('/dashboard');
  }

  return children;
}
