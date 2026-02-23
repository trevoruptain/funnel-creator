import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
