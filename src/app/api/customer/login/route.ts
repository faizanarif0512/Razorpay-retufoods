import { NextRequest, NextResponse } from 'next/server';
import { authenticateCustomer } from '@/lib/db/service';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const customer = authenticateCustomer(email, password);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

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
    return NextResponse.json({ success: false, error: err.message || 'Login failed' }, { status: 500 });
  }
}
