import { NextRequest, NextResponse } from 'next/server';
import { isLoginBlocked, recordLoginFailure, clearLoginFailures, TOO_MANY_ATTEMPTS } from '@/lib/auth/rateLimit';
import { authenticateCustomer } from '@/lib/db/service';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    if (isLoginBlocked(req, 'customer', email)) {
      return NextResponse.json({ success: false, error: TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    const customer = await authenticateCustomer(email, password);
    if (!customer) {
      recordLoginFailure(req, 'customer', email);
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    clearLoginFailures(req, 'customer', email);
    const token = createCustomerToken(customer.id);
    const response = NextResponse.json({
      success: true,
      customer,
      message: 'Login successful',
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
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
