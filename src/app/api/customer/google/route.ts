import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomerOAuth } from '@/lib/db/service';
import { createCustomerToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/customer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, email: rawEmail, name: rawName, googleId } = body;

    let email = rawEmail;
    let name = rawName;

    // If standard Google ID token (JWT) is sent from Google Identity Services
    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) {
            email = payload.email;
            name = payload.name || payload.given_name || 'Google Customer';
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse Google ID token:', parseErr);
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Valid Google email is required to sign in' },
        { status: 400 }
      );
    }

    // Persist or lookup customer in SQLite & Neon
    const customer = await findOrCreateCustomerOAuth({
      email: email.trim().toLowerCase(),
      name: name || 'Google Customer',
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
    return NextResponse.json(
      { success: false, error: err.message || 'Google authentication failed' },
      { status: 500 }
    );
  }
}
