import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminCredentials, createAdminToken, SESSION_COOKIE_NAME } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    const session = await authenticateAdminCredentials(email, password);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = createAdminToken(session);
    const response = NextResponse.json({
      success: true,
      admin: { name: session.name, email: session.email, role: session.role },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
