import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomerOAuth } from '@/lib/db/service';
import { getSupabase } from '@/lib/db/supabase';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';

// Exchanges a Supabase Auth session (from Google OAuth) for a store customer session.
// The access token is verified with Supabase, so the email cannot be spoofed by the client.
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Missing Google session' }, { status: 400 });
    }

    const { data, error } = await getSupabase().auth.getUser(accessToken);
    const user = data?.user;
    if (error || !user?.email) {
      return NextResponse.json({ success: false, error: 'Google session is invalid or expired' }, { status: 401 });
    }

    const customer = await findOrCreateCustomerOAuth({
      email: user.email.toLowerCase(),
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'Google Customer',
    });

    const token = createCustomerToken(customer.id);
    const response = NextResponse.json({
      success: true,
      customer,
      message: 'Signed in with Google successfully',
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('[GOOGLE AUTH API ERROR]:', err);
    return NextResponse.json({ success: false, error: 'Google sign-in failed' }, { status: 500 });
  }
}
