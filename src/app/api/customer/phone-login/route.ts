import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomerPhone } from '@/lib/db/service';
import { getSupabase } from '@/lib/db/supabase';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';

// The browser sends and verifies the SMS OTP with Supabase Auth, then posts the resulting
// access token here. The phone number is taken from the verified Supabase user, never the request.
export async function POST(req: NextRequest) {
  try {
    const { accessToken, name } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Missing phone verification session' }, { status: 400 });
    }

    const { data, error } = await getSupabase().auth.getUser(accessToken);
    const user = data?.user;
    if (error || !user?.phone) {
      return NextResponse.json({ success: false, error: 'Phone verification is invalid or expired' }, { status: 401 });
    }

    const customer = await findOrCreateCustomerPhone({
      phone: user.phone,
      name: typeof name === 'string' && name.trim() ? name.trim() : undefined,
    });

    const token = createCustomerToken(customer.id);
    const response = NextResponse.json({
      success: true,
      customer,
      message: 'Logged in successfully',
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
    console.error('[PHONE LOGIN API ERROR]:', err);
    return NextResponse.json({ success: false, error: 'Phone login failed' }, { status: 500 });
  }
}
