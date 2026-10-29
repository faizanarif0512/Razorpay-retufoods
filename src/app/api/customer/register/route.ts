import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/lib/db/service';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';
import { sendCustomerWelcomeEmail } from '@/lib/notifications/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password, address_line1, address_line2, city, state, postal_code } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!phone || phone.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const customer = await createCustomer({
      name,
      email,
      phone,
      password,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
    });

    // Send transactional welcome email asynchronously
    sendCustomerWelcomeEmail(customer).catch((err) => console.error('[WELCOME EMAIL ERROR]:', err));

    const token = createCustomerToken(customer.id);
    const response = NextResponse.json({
      success: true,
      customer,
      message: 'Account created successfully',
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
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 400 });
  }
}
